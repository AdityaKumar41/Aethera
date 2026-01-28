// ============================================
// Oracle Service - Production Data Management
// ============================================

import { prisma } from "./index";
import { Prisma } from "@prisma/client";

/**
 * Production data entry for oracle service
 */
export interface ProductionDataEntry {
  projectId: string;
  energyProduced: number; // kWh
  recordedAt: Date;
  source: "MANUAL" | "AUTOMATIC" | "METER";
  verifiedBy?: string; // Admin ID who verified
  notes?: string;
}

/**
 * Project performance metrics
 */
export interface ProjectPerformance {
  projectId: string;
  totalEnergyProduced: number; // Total kWh
  expectedAnnualProduction: number; // Target kWh/year
  actualPerformanceRatio: number; // Actual vs Expected (%)
  currentYieldRate: number; // Current APY based on performance
  lastUpdated: Date;
  dataPoints: number; // Number of production records
}

/**
 * Yield calculation result
 */
export interface YieldCalculation {
  projectId: string;
  periodStart: Date;
  periodEnd: Date;
  energyProduced: number;
  revenueGenerated: number; // Calculated revenue
  yieldPerToken: number; // Yield per token
  totalTokens: number;
  distributionReady: boolean;
}

/**
 * Oracle Service for managing production data and yield calculations
 */
export class OracleService {
  /**
   * Record production data for a project
   */
  static async recordProductionData(data: ProductionDataEntry): Promise<any> {
    try {
      // Validate project exists and is active
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: {
          id: true,
          status: true,
          estimatedAnnualProduction: true,
          totalTokens: true,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
        throw new Error(
          `Cannot record production data for project in ${project.status} status`,
        );
      }

      // Create production record
      const record = await prisma.productionData.create({
        data: {
          projectId: data.projectId,
          energyProduced: data.energyProduced,
          recordedAt: data.recordedAt,
          source: data.source,
          verifiedBy: data.verifiedBy,
          notes: data.notes,
        },
      });

      console.log("✅ Production data recorded:", {
        projectId: data.projectId,
        energyProduced: data.energyProduced,
        recordedAt: data.recordedAt,
      });

      // Update project performance metrics
      await this.updateProjectPerformance(data.projectId);

      return record;
    } catch (error) {
      console.error("❌ Failed to record production data:", error);
      throw error;
    }
  }

  /**
   * Update project performance metrics based on production data
   */
  static async updateProjectPerformance(
    projectId: string,
  ): Promise<ProjectPerformance> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        productionData: {
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Calculate total energy produced
    const totalEnergyProduced = project.productionData.reduce(
      (sum, record) => sum + Number(record.energyProduced),
      0,
    );

    // Calculate performance ratio
    const expectedAnnual = Number(project.estimatedAnnualProduction || 0);
    const dataPoints = project.productionData.length;

    // Annualized performance (simple extrapolation)
    const daysOfData =
      dataPoints > 0 ? this.calculateDaysOfData(project.productionData) : 0;
    const annualizedProduction =
      daysOfData > 0 ? (totalEnergyProduced / daysOfData) * 365 : 0;

    const performanceRatio =
      expectedAnnual > 0 ? (annualizedProduction / expectedAnnual) * 100 : 0;

    // Adjust yield rate based on performance
    const baseYield = Number(project.expectedYield || 0);
    const adjustedYield = (baseYield * performanceRatio) / 100;

    // Update project with performance metrics
    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalEnergyProduced,
        currentYieldRate: adjustedYield,
        lastProductionUpdate: new Date(),
      },
    });

    return {
      projectId,
      totalEnergyProduced,
      expectedAnnualProduction: expectedAnnual,
      actualPerformanceRatio: performanceRatio,
      currentYieldRate: adjustedYield,
      lastUpdated: new Date(),
      dataPoints,
    };
  }

  /**
   * Calculate days of data from production records
   */
  private static calculateDaysOfData(
    records: Array<{ recordedAt: Date }>,
  ): number {
    if (records.length === 0) return 0;

    const dates = records.map((r) => new Date(r.recordedAt));
    const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const newest = new Date(Math.max(...dates.map((d) => d.getTime())));

    const diffTime = Math.abs(newest.getTime() - oldest.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(diffDays, 1); // At least 1 day
  }

  /**
   * Calculate yield for a time period
   */
  static async calculateYield(
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
    revenuePerKwh: number = 0.12, // Default $0.12/kWh
  ): Promise<YieldCalculation> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        productionData: {
          where: {
            recordedAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Sum energy produced in period
    const energyProduced = project.productionData.reduce(
      (sum, record) => sum + Number(record.energyProduced),
      0,
    );

    // Calculate revenue
    const revenueGenerated = energyProduced * revenuePerKwh;

    // Calculate yield per token
    const totalTokens = Number(project.totalTokens || 0);
    const yieldPerToken = totalTokens > 0 ? revenueGenerated / totalTokens : 0;

    console.log("📊 Yield calculation:", {
      projectId,
      period: `${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
      energyProduced: `${energyProduced.toFixed(2)} kWh`,
      revenue: `$${revenueGenerated.toFixed(2)}`,
      yieldPerToken: `$${yieldPerToken.toFixed(4)}`,
    });

    return {
      projectId,
      periodStart,
      periodEnd,
      energyProduced,
      revenueGenerated,
      yieldPerToken,
      totalTokens,
      distributionReady: energyProduced > 0,
    };
  }

  /**
   * Get project performance summary
   */
  static async getProjectPerformance(
    projectId: string,
  ): Promise<ProjectPerformance | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        productionData: true,
      },
    });

    if (!project) {
      return null;
    }

    const totalEnergyProduced = Number(project.totalEnergyProduced || 0);
    const expectedAnnual = Number(project.estimatedAnnualProduction || 0);
    const currentYield = Number(
      project.currentYieldRate || project.expectedYield || 0,
    );

    const dataPoints = project.productionData.length;
    const daysOfData = this.calculateDaysOfData(project.productionData);
    const annualized =
      daysOfData > 0 ? (totalEnergyProduced / daysOfData) * 365 : 0;
    const performanceRatio =
      expectedAnnual > 0 ? (annualized / expectedAnnual) * 100 : 0;

    return {
      projectId,
      totalEnergyProduced,
      expectedAnnualProduction: expectedAnnual,
      actualPerformanceRatio: performanceRatio,
      currentYieldRate: currentYield,
      lastUpdated: project.lastProductionUpdate || new Date(),
      dataPoints,
    };
  }

  /**
   * Get production data history for a project
   */
  static async getProductionHistory(
    projectId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return await prisma.productionData.findMany({
      where: { projectId },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get recent production data across all active projects
   */
  static async getRecentProductionData(limit: number = 20): Promise<any[]> {
    return await prisma.productionData.findMany({
      orderBy: { recordedAt: "desc" },
      take: limit,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            tokenSymbol: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Bulk import production data (for CSV uploads, etc.)
   */
  static async bulkImportProductionData(
    entries: ProductionDataEntry[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        await this.recordProductionData(entry);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(
          `Failed to import ${entry.projectId} @ ${entry.recordedAt}: ${error.message}`,
        );
      }
    }

    return { success, failed, errors };
  }

  /**
   * Validate production data entry
   */
  static validateProductionData(data: ProductionDataEntry): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.projectId || data.projectId.trim() === "") {
      errors.push("Project ID is required");
    }

    if (data.energyProduced === undefined || data.energyProduced === null) {
      errors.push("Energy produced is required");
    } else if (data.energyProduced < 0) {
      errors.push("Energy produced cannot be negative");
    } else if (data.energyProduced > 1000000) {
      errors.push("Energy produced value seems unrealistic (>1M kWh)");
    }

    if (!data.recordedAt) {
      errors.push("Recorded date is required");
    } else if (data.recordedAt > new Date()) {
      errors.push("Recorded date cannot be in the future");
    }

    if (!["MANUAL", "AUTOMATIC", "METER"].includes(data.source)) {
      errors.push("Invalid data source");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
