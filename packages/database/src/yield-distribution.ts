// ============================================
// Yield Distribution Service
// ============================================

import { prisma } from "./index";
import { OracleService } from "./oracle";
import { AuditLogger } from "./audit";
import { Prisma } from "@prisma/client";

/**
 * Yield distribution parameters
 */
export interface YieldDistributionParams {
  projectId: string;
  periodStart: Date;
  periodEnd: Date;
  revenuePerKwh?: number;
  platformFeePercent?: number;
  triggeredBy: string; // Admin user ID
  notes?: string;
}

/**
 * Yield claim information
 */
export interface InvestorYieldClaim {
  investorId: string;
  investorName: string;
  tokenAmount: number;
  yieldAmount: number;
  claimed: boolean;
  claimedAt?: Date;
  txHash?: string;
}

/**
 * Distribution summary
 */
export interface DistributionSummary {
  distributionId: string;
  projectId: string;
  projectName: string;
  period: Date;
  totalRevenue: number;
  platformFee: number;
  totalYield: number;
  yieldPerToken: number;
  investorCount: number;
  claimedCount: number;
  pendingCount: number;
  distributed: boolean;
  distributedAt?: Date;
}

/**
 * Yield Distribution Service
 */
export class YieldDistributionService {
  /**
   * Create a yield distribution for a project
   */
  static async createDistribution(
    params: YieldDistributionParams,
  ): Promise<any> {
    const {
      projectId,
      periodStart,
      periodEnd,
      revenuePerKwh = 0.12,
      platformFeePercent = 10,
      triggeredBy,
      notes,
    } = params;

    // Validate project exists and is active
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        investments: {
          where: { status: "CONFIRMED" },
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
                stellarPubKey: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
      throw new Error(
        `Cannot distribute yield for project in ${project.status} status. Project must be ACTIVE or COMPLETED.`,
      );
    }

    // Calculate yield using oracle service
    const yieldCalc = await OracleService.calculateYield(
      projectId,
      periodStart,
      periodEnd,
      revenuePerKwh,
    );

    if (yieldCalc.energyProduced === 0) {
      throw new Error(
        "No production data available for this period. Cannot distribute yield.",
      );
    }

    // Calculate platform fee
    const platformFee = (yieldCalc.revenueGenerated * platformFeePercent) / 100;
    const totalYield = yieldCalc.revenueGenerated - platformFee;
    const yieldPerToken =
      yieldCalc.totalTokens > 0 ? totalYield / yieldCalc.totalTokens : 0;

    console.log("💰 Creating yield distribution:", {
      project: project.name,
      period: `${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
      revenue: `$${yieldCalc.revenueGenerated.toFixed(2)}`,
      platformFee: `$${platformFee.toFixed(2)} (${platformFeePercent}%)`,
      totalYield: `$${totalYield.toFixed(2)}`,
      yieldPerToken: `$${yieldPerToken.toFixed(6)}`,
      investors: project.investments.length,
    });

    // Create distribution record
    const distribution = await prisma.$transaction(async (tx) => {
      // Create the distribution
      const dist = await tx.yieldDistribution.create({
        data: {
          projectId,
          period: periodEnd, // Use end date as the period identifier
          totalRevenue: yieldCalc.revenueGenerated,
          platformFee,
          totalYield,
          yieldPerToken,
          distributed: false,
          metadata: {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            energyProduced: yieldCalc.energyProduced,
            revenuePerKwh,
            platformFeePercent,
            triggeredBy,
            notes,
          },
        },
      });

      // Create yield claims for each investor
      const claims = await Promise.all(
        project.investments.map((investment) => {
          const claimAmount = investment.tokenAmount * yieldPerToken;
          return tx.yieldClaim.create({
            data: {
              distributionId: dist.id,
              investorId: investment.investorId,
              tokenAmount: investment.tokenAmount,
              amount: claimAmount,
              claimed: false,
            },
          });
        }),
      );

      console.log(`✅ Created ${claims.length} yield claims`);

      return dist;
    });

    // Log the distribution creation
    await AuditLogger.logStateChange({
      entityType: "PROJECT",
      entityId: projectId,
      fromState: "YIELD_CALCULATION",
      toState: "YIELD_READY_FOR_CLAIM",
      triggeredBy,
      metadata: {
        distributionId: distribution.id,
        totalYield,
        investorCount: project.investments.length,
      },
      timestamp: new Date(),
    });

    return distribution;
  }

  /**
   * Mark distribution as distributed (after on-chain distribution)
   */
  static async markAsDistributed(
    distributionId: string,
    txHash: string,
    adminId: string,
    onChainDistributionId?: bigint,
  ): Promise<any> {
    const distribution = await prisma.yieldDistribution.update({
      where: { id: distributionId },
      data: {
        distributed: true,
        distributedAt: new Date(),
        txHash,
        onChainDistributionId,
      },
    });

    console.log(`✅ Distribution ${distributionId} marked as distributed`);
    console.log(`   TX Hash: ${txHash}`);

    await AuditLogger.logStateChange({
      entityType: "PROJECT",
      entityId: distribution.projectId,
      fromState: "YIELD_READY_FOR_CLAIM",
      toState: "YIELD_DISTRIBUTED",
      triggeredBy: adminId,
      metadata: { distributionId, txHash },
      timestamp: new Date(),
    });

    return distribution;
  }

  /**
   * Process investor claim
   */
  static async processClaim(claimId: string, txHash: string): Promise<any> {
    const claim = await prisma.yieldClaim.update({
      where: { id: claimId },
      data: {
        claimed: true,
        claimedAt: new Date(),
        txHash,
      },
      include: {
        distribution: {
          include: {
            project: {
              select: { name: true, tokenSymbol: true },
            },
          },
        },
        investor: {
          select: { name: true, email: true },
        },
      },
    });

    console.log("✅ Yield claim processed:", {
      investor: claim.investor.name,
      project: claim.distribution.project.name,
      amount: `$${Number(claim.amount).toFixed(2)}`,
      txHash,
    });

    return claim;
  }

  /**
   * Get all claims for an investor
   */
  static async getInvestorClaims(
    investorId: string,
    options: {
      claimed?: boolean;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    const where: any = { investorId };

    if (options.claimed !== undefined) {
      where.claimed = options.claimed;
    }

    return await prisma.yieldClaim.findMany({
      where,
      include: {
        distribution: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                tokenSymbol: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
    });
  }

  /**
   * Get pending claims for an investor
   */
  static async getPendingClaims(investorId: string): Promise<any[]> {
    return this.getInvestorClaims(investorId, { claimed: false });
  }

  /**
   * Get distribution summary
   */
  static async getDistributionSummary(
    distributionId: string,
  ): Promise<DistributionSummary | null> {
    const distribution = await prisma.yieldDistribution.findUnique({
      where: { id: distributionId },
      include: {
        project: {
          select: { name: true },
        },
        claims: {
          select: {
            claimed: true,
          },
        },
      },
    });

    if (!distribution) {
      return null;
    }

    const totalClaims = distribution.claims.length;
    const claimedCount = distribution.claims.filter((c) => c.claimed).length;
    const pendingCount = totalClaims - claimedCount;

    return {
      distributionId: distribution.id,
      projectId: distribution.projectId,
      projectName: distribution.project.name,
      period: distribution.period,
      totalRevenue: Number(distribution.totalRevenue),
      platformFee: Number(distribution.platformFee),
      totalYield: Number(distribution.totalYield),
      yieldPerToken: Number(distribution.yieldPerToken),
      investorCount: totalClaims,
      claimedCount,
      pendingCount,
      distributed: distribution.distributed,
      distributedAt: distribution.distributedAt || undefined,
    };
  }

  /**
   * Get all distributions for a project
   */
  static async getProjectDistributions(
    projectId: string,
    limit: number = 20,
  ): Promise<any[]> {
    return await prisma.yieldDistribution.findMany({
      where: { projectId },
      include: {
        claims: {
          select: {
            claimed: true,
          },
        },
      },
      orderBy: { period: "desc" },
      take: limit,
    });
  }

  /**
   * Get recent distributions (admin dashboard)
   */
  static async getRecentDistributions(limit: number = 20): Promise<any[]> {
    return await prisma.yieldDistribution.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            tokenSymbol: true,
          },
        },
        claims: {
          select: {
            claimed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Calculate total pending yield for an investor
   */
  static async calculatePendingYield(investorId: string): Promise<number> {
    const pendingClaims = await this.getPendingClaims(investorId);
    return pendingClaims.reduce((sum, claim) => sum + Number(claim.amount), 0);
  }

  /**
   * Calculate total claimed yield for an investor
   */
  static async calculateClaimedYield(investorId: string): Promise<number> {
    const claimedClaims = await this.getInvestorClaims(investorId, {
      claimed: true,
    });
    return claimedClaims.reduce((sum, claim) => sum + Number(claim.amount), 0);
  }

  /**
   * Batch claim multiple yields at once
   */
  static async batchClaim(
    claimIds: string[],
    txHashes: string[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    if (claimIds.length !== txHashes.length) {
      throw new Error("Number of claim IDs and transaction hashes must match");
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < claimIds.length; i++) {
      try {
        await this.processClaim(claimIds[i], txHashes[i]);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Claim ${claimIds[i]}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}
