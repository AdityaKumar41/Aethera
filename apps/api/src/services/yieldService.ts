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
  ContractInvocationResult,
} from "@aethera/stellar";
import { Keypair, scValToNative, xdr } from "@stellar/stellar-sdk";
import {
  investmentService,
  getInvestmentService,
} from "./investmentService.js";
import { notificationService } from "./notificationService.js";

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
      triggeredBy: params.adminId,
    });

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { tokenContractId: true },
    });

    // 2. Perform on-chain distribution logic
    try {
      const contracts = getContractAddresses();
      if (contracts.yieldDistributor && project?.tokenContractId) {
        const adminSecret = process.env.STAT_RELAYER_SECRET;
        if (!adminSecret) throw new Error("Admin secret not configured");

        const adminKeypair = Keypair.fromSecret(adminSecret);

        // Extract energy produced from distribution metadata
        const metadata = distribution.metadata as Record<
          string,
          unknown
        > | null;
        const energyProduced = Number(metadata?.energyProduced || 0);
        const energyKwhScaled = BigInt(Math.round(energyProduced * 10000));
        const revenuePerKwhScaled = BigInt(
          Math.round(params.revenuePerKwh * 10_000_000),
        );

        const result = await contractService.createYieldDistribution(
          contracts.yieldDistributor,
          adminKeypair,
          params.projectId,
          project.tokenContractId,
          Math.floor(params.periodStart.getTime() / 1000),
          Math.floor(params.periodEnd.getTime() / 1000),
          energyKwhScaled,
          revenuePerKwhScaled,
        );

        if (result.success && result.txHash) {
          let onChainDistributionId: bigint | undefined;
          if (result.result) {
            const native = scValToNative(result.result as xdr.ScVal);
            if (typeof native === "bigint") onChainDistributionId = native;
            else if (typeof native === "number")
              onChainDistributionId = BigInt(native);
          }

          // Update DB distribution with tx hash
          await YieldDistributionService.markAsDistributed(
            distribution.id,
            result.txHash,
            params.adminId,
            onChainDistributionId,
          );

          return {
            success: true,
            distributionId: distribution.id,
            txHash: result.txHash,
          };
        }
      }
    } catch (error: any) {
      console.error("On-chain distribution failed:", error);
      return {
        success: false,
        distributionId: distribution.id,
        error: `On-chain anchoring failed: ${error.message || "Unknown error"}. Claims were created but are not claimable until on-chain distribution succeeds.`,
      };
    }

    // 3. Send notifications to all investors with new claims
    try {
      const claims = await prisma.yieldClaim.findMany({
        where: { distributionId: distribution.id },
        include: { investor: { select: { email: true, name: true } } },
      });
      const projectInfo = await prisma.project.findUnique({
        where: { id: params.projectId },
        select: { name: true },
      });
      const periodStr = `${params.periodStart.toLocaleDateString()} - ${params.periodEnd.toLocaleDateString()}`;

      for (const claim of claims) {
        if (claim.investor?.email) {
          notificationService.notifyYieldAvailable({
            email: claim.investor.email,
            investorName: claim.investor.name || "Investor",
            projectName: projectInfo?.name || params.projectId,
            amount: Number(claim.amount),
            period: periodStr,
          }).catch((e) => console.error("Yield notification failed:", e));
        }
      }
    } catch (notifError) {
      console.error("Failed to send yield notifications:", notifError);
    }

    return {
      success: true,
      distributionId: distribution.id,
      notice: "On-chain anchoring skipped (no contract configured). Claims created in DB only.",
    };
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
          include: { project: true },
        },
        investor: true,
      },
    });

    if (!claim || claim.investorId !== userId || claim.claimed) {
      throw new Error("Invalid or already processed claim");
    }

    if (!claim.distribution.onChainDistributionId) {
      throw new Error("On-chain distribution not anchored yet");
    }

    // 2. Perform on-chain claim
    try {
      const contracts = getContractAddresses();
      if (contracts.yieldDistributor) {
        const investorKeypair = await investmentService.getInvestorKeypair(
          claim.investor,
        );

        const result = await contractService.claimYield(
          contracts.yieldDistributor,
          investorKeypair,
          claim.distribution.onChainDistributionId,
        );

        if (result.success && result.txHash) {
          // 3. Mark in DB as claimed
          const updated = await YieldDistributionService.processClaim(
            claim.id,
            result.txHash,
          );
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

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount,
      failed: claimIds.length - successCount,
      details: results,
    };
  }
}

export const yieldService = YieldService.getInstance();
export default yieldService;
