/**
 * Yield Service
 * 
 * Handles the on-chain logic for yield distribution and claims.
 * Bridges the database records with Soroban contract interactions.
 */

import Decimal, { prisma, YieldDistributionService } from "@aethera/database";
import { createHash, createHmac, randomBytes } from "crypto";
import { 
  contractService, 
  getContractAddresses, 
  stellarClient,
  ContractInvocationResult 
} from "@aethera/stellar";
import { Keypair } from "@stellar/stellar-sdk";
import { investmentService } from "./investmentService.js"; // Reuse decryption logic

export class YieldService {
  private static instance: YieldService | null = null;

  private constructor() {}

  static getInstance(): YieldService {
    if (!YieldService.instance) {
      YieldService.instance = new YieldService();
    }
    return YieldService.instance;
  }

  /**
   * Distribute yield for a project (Admin)
   */
  async distributeYield(params: {
    projectId: string;
    periodStart: Date;
    periodEnd: Date;
    revenuePerKwh: number;
    platformFeePercent: number;
    adminId: string;
    notes?: string;
  }) {
    // 1. Create DB distribution and claims
    const distribution = await YieldDistributionService.createDistribution({
      ...params,
      triggeredBy: params.adminId
    });
    
    // 2. Perform on-chain distribution logic
    try {
      const contracts = getContractAddresses();
      if (contracts.yieldDistributor) {
        const adminSecret = process.env.STAT_RELAYER_SECRET;
        if (!adminSecret) throw new Error("Admin secret not configured");
        
        const adminKeypair = Keypair.fromSecret(adminSecret);
        
        // Scale total yield for on-chain (7 decimals for USDC)
        const totalYieldScaled = BigInt(Math.round(distribution.totalYield * 10_000_000));
        
        const result = await contractService.distributeYield(
          contracts.yieldDistributor,
          adminKeypair,
          params.projectId,
          totalYieldScaled
        );
        
        if (result.success && result.txHash) {
          // Update DB distribution with tx hash
          await YieldDistributionService.markAsDistributed(
            distribution.id,
            result.txHash,
            params.adminId
          );
          
          return { success: true, distributionId: distribution.id, txHash: result.txHash };
        }
      }
    } catch (error: any) {
      console.error("On-chain distribution failed:", error);
      // We still return the DB distribution, but marked as not on-chain yet
    }
    
    return { success: true, distributionId: distribution.id, notice: "On-chain anchoring failed or skipped" };
  }

  /**
   * Process an investor yield claim (Investor)
   */
  async claimYield(claimId: string, userId: string) {
    // 1. Get claim and validate
    const claim = await prisma.yieldClaim.findUnique({
      where: { id: claimId },
      include: { 
        distribution: { 
          include: { project: true } 
        },
        investor: true
      }
    });

    if (!claim || claim.investorId !== userId || claim.claimed) {
      throw new Error("Invalid or already processed claim");
    }

    // 2. Perform on-chain claim
    try {
      const contracts = getContractAddresses();
      if (contracts.yieldDistributor) {
        // Reuse decryption logic from investmentService
        const investorKeypair = await (investmentService as any).getInvestorKeypair(claim.investor);
        
        const result = await contractService.claimYield(
          contracts.yieldDistributor,
          investorKeypair,
          claim.distribution.projectId
        );
        
        if (result.success && result.txHash) {
          // 3. Mark in DB as claimed
          const updated = await YieldDistributionService.processClaim(claim.id, result.txHash);
          return { success: true, claim: updated, txHash: result.txHash };
        } else {
          throw new Error(result.error || "On-chain claim failed");
        }
      }
    } catch (error: any) {
      console.error("Yield claim failed:", error);
      throw error;
    }
    
    throw new Error("Yield distributor contract not configured");
  }

  /**
   * Batch claim multiple yields
   */
  async batchClaim(claimIds: string[], userId: string) {
    const results = [];
    for (const claimId of claimIds) {
      try {
        const result = await this.claimYield(claimId, userId);
        results.push(result);
      } catch (error: any) {
        results.push({ success: false, claimId, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount,
      failed: claimIds.length - successCount,
      details: results
    };
  }
}

export const yieldService = YieldService.getInstance();
export default yieldService;
