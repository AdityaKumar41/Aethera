import { prisma, ProjectStatus } from "@aethera/database";
import { yieldService } from "./yieldService.js";
import { PLATFORM_FEE_PERCENTAGE } from "@aethera/config";

/**
 * Revenue Service
 * 
 * Manages off-chain revenue reporting by installers and coordinates
 * with the yield service for distribution to investors.
 */
export class RevenueService {
  private static instance: RevenueService | null = null;

  private constructor() {}

  static getInstance(): RevenueService {
    if (!RevenueService.instance) {
      RevenueService.instance = new RevenueService();
    }
    return RevenueService.instance;
  }

  /**
   * Report revenue for a project (Installer)
   */
  async reportRevenue(params: {
    projectId: string;
    installerId: string;
    amount: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    evidence?: any;
    autoDistribute?: boolean;
  }) {
    // 1. Validate project and ownership
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, installerId: true, status: true, capacity: true }
    });

    if (!project) throw new Error("Project not found");
    if (project.installerId !== params.installerId) throw new Error("Unauthorized: Only the project installer can report revenue");
    if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
      throw new Error(`Cannot report revenue for project in ${project.status} state`);
    }

    // 2. Validate revenue against production data
    const production = await prisma.productionData.aggregate({
      where: {
        projectId: params.projectId,
        recordedAt: {
          gte: params.periodStart,
          lte: params.periodEnd
        }
      },
      _sum: { energyProduced: true }
    });

    const totalKwh = Number(production._sum.energyProduced || 0);
    const revenuePerKwh = totalKwh > 0 ? params.amount / totalKwh : 0;

    // 3. Create revenue record (We can add a Revenue model to schema later if needed, 
    // for now we directly trigger yield distribution if autoDistribute is true)
    
    console.log(`💰 Revenue reported for project ${params.projectId}: ${params.amount} ${params.currency}`);
    console.log(`📊 Production for period: ${totalKwh.toFixed(2)} kWh (${revenuePerKwh.toFixed(4)} ${params.currency}/kWh)`);

    if (params.autoDistribute) {
      return await yieldService.distributeYield({
        projectId: params.projectId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        revenuePerKwh,
        platformFeePercent: PLATFORM_FEE_PERCENTAGE,
        adminId: params.installerId, // In this flow, the installer triggers the distribution
        notes: `Automated distribution from revenue report. Total KWh: ${totalKwh.toFixed(2)}`
      });
    }

    return { success: true, revenuePerKwh, totalKwh };
  }
}

export const revenueService = RevenueService.getInstance();
export default revenueService;
