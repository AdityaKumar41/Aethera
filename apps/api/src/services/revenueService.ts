import { prisma, ProjectStatus } from "@aethera/database";
import { yieldService } from "./yieldService.js";
import { tariffService } from "./tariffService.js";
import { PLATFORM_FEE_PERCENTAGE } from "@aethera/config";

/**
 * Revenue Service
 *
 * Manages off-chain revenue reporting by installers, admin review,
 * and coordinates with the yield service for distribution to investors.
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
   * Now persisted to RevenueReport table
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
      select: { id: true, installerId: true, status: true, capacity: true },
    });

    if (!project) throw new Error("Project not found");
    if (project.installerId !== params.installerId)
      throw new Error(
        "Unauthorized: Only the project installer can report revenue",
      );
    if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
      throw new Error(
        `Cannot report revenue for project in ${project.status} state`,
      );
    }

    // 2. Validate revenue against production data
    const production = await prisma.productionData.aggregate({
      where: {
        projectId: params.projectId,
        recordedAt: {
          gte: params.periodStart,
          lte: params.periodEnd,
        },
      },
      _sum: { energyProduced: true },
    });

    const totalKwh = Number(production._sum.energyProduced || 0);
    const revenuePerKwh = totalKwh > 0 ? params.amount / totalKwh : 0;

    // 3. Persist revenue report
    const report = await prisma.revenueReport.create({
      data: {
        projectId: params.projectId,
        installerId: params.installerId,
        amount: params.amount,
        currency: params.currency,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        evidence: params.evidence,
        totalKwh: totalKwh,
        revenuePerKwh: revenuePerKwh,
        status: params.autoDistribute ? "DISTRIBUTED" : "PENDING",
      },
    });

    console.log(
      `💰 Revenue reported for project ${params.projectId}: ${params.amount} ${params.currency}`,
    );
    console.log(
      `📊 Production for period: ${totalKwh.toFixed(2)} kWh (${revenuePerKwh.toFixed(4)} ${params.currency}/kWh)`,
    );

    if (params.autoDistribute) {
      const distribution = await yieldService.distributeYield({
        projectId: params.projectId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        revenuePerKwh,
        platformFeePercent: PLATFORM_FEE_PERCENTAGE,
        adminId: params.installerId,
        notes: `Automated distribution from revenue report ${report.id}. Total KWh: ${totalKwh.toFixed(2)}`,
      });

      // Link distribution to revenue report
      if (distribution.distributionId) {
        await prisma.revenueReport.update({
          where: { id: report.id },
          data: { distributionId: distribution.distributionId },
        });
      }

      return { ...distribution, reportId: report.id };
    }

    return { success: true, reportId: report.id, revenuePerKwh, totalKwh };
  }

  /**
   * Get revenue report history for a project
   */
  async getRevenueHistory(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const [reports, total] = await Promise.all([
      prisma.revenueReport.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.revenueReport.count({ where: { projectId } }),
    ]);

    return { reports, total };
  }

  /**
   * Get a single revenue report
   */
  async getRevenueReport(reportId: string) {
    return await prisma.revenueReport.findUnique({
      where: { id: reportId },
      include: { project: { select: { name: true, tokenSymbol: true } } },
    });
  }

  /**
   * Admin review a revenue report
   */
  async reviewRevenue(params: {
    reportId: string;
    reviewerId: string;
    status: "APPROVED" | "REJECTED";
    notes?: string;
  }) {
    const report = await prisma.revenueReport.findUnique({
      where: { id: params.reportId },
    });

    if (!report) throw new Error("Revenue report not found");
    if (report.status !== "PENDING")
      throw new Error(`Cannot review report in ${report.status} status`);

    const updated = await prisma.revenueReport.update({
      where: { id: params.reportId },
      data: {
        status: params.status,
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.notes,
      },
    });

    // If approved, optionally trigger distribution
    if (params.status === "APPROVED" && report.revenuePerKwh) {
      const distribution = await yieldService.distributeYield({
        projectId: report.projectId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        revenuePerKwh: Number(report.revenuePerKwh),
        platformFeePercent: PLATFORM_FEE_PERCENTAGE,
        adminId: params.reviewerId,
        notes: `Distribution from approved revenue report ${report.id}`,
      });

      if (distribution.distributionId) {
        await prisma.revenueReport.update({
          where: { id: params.reportId },
          data: {
            status: "DISTRIBUTED",
            distributionId: distribution.distributionId,
          },
        });
      }

      return { report: updated, distribution };
    }

    return { report: updated };
  }

  /**
   * Get pending revenue reports for admin review
   */
  async getPendingReports(options?: { limit?: number; offset?: number }) {
    const [reports, total] = await Promise.all([
      prisma.revenueReport.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: { project: { select: { name: true, tokenSymbol: true } } },
      }),
      prisma.revenueReport.count({ where: { status: "PENDING" } }),
    ]);

    return { reports, total };
  }

  /**
   * Get revenue summary for a project
   */
  async getRevenueSummary(projectId: string) {
    const [totalRevenue, reportCount, latestReport] = await Promise.all([
      prisma.revenueReport.aggregate({
        where: {
          projectId,
          status: { in: ["APPROVED", "DISTRIBUTED"] },
        },
        _sum: { amount: true, totalKwh: true },
      }),
      prisma.revenueReport.count({
        where: { projectId },
      }),
      prisma.revenueReport.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Get auto-calculated revenue from tariff rates
    const activeTariff = await tariffService.getActiveRate(projectId);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalKwh: Number(totalRevenue._sum.totalKwh || 0),
      reportCount,
      latestReport,
      activeTariff: activeTariff
        ? {
            ratePerKwh: Number(activeTariff.ratePerKwh),
            currency: activeTariff.currency,
          }
        : null,
    };
  }
}

export const revenueService = RevenueService.getInstance();
export default revenueService;
