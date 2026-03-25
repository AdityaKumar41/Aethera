/**
 * Tariff Service
 *
 * Manages PPA / tariff rate configuration per project.
 * Supports time-bounded rates so tariffs can change over a project's lifetime.
 */

import { prisma } from "@aethera/database";

export class TariffService {
  private static instance: TariffService | null = null;

  private constructor() {}

  static getInstance(): TariffService {
    if (!TariffService.instance) {
      TariffService.instance = new TariffService();
    }
    return TariffService.instance;
  }

  /**
   * Set a tariff for a project
   */
  async setTariff(params: {
    projectId: string;
    ratePerKwh: number;
    currency?: string;
    ppaContractRef?: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
    notes?: string;
  }) {
    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    });
    if (!project) throw new Error("Project not found");

    // Close any existing open-ended tariff for this project
    if (!params.effectiveTo) {
      await prisma.projectTariff.updateMany({
        where: {
          projectId: params.projectId,
          effectiveTo: null,
        },
        data: {
          effectiveTo: params.effectiveFrom,
        },
      });
    }

    return await prisma.projectTariff.create({
      data: {
        projectId: params.projectId,
        ratePerKwh: params.ratePerKwh,
        currency: params.currency || "USDC",
        ppaContractRef: params.ppaContractRef,
        effectiveFrom: params.effectiveFrom,
        effectiveTo: params.effectiveTo,
        notes: params.notes,
      },
    });
  }

  /**
   * Get the currently active tariff for a project
   */
  async getActiveRate(projectId: string) {
    const now = new Date();

    const tariff = await prisma.projectTariff.findFirst({
      where: {
        projectId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return tariff;
  }

  /**
   * Get all tariffs for a project (history)
   */
  async getTariffHistory(projectId: string) {
    return await prisma.projectTariff.findMany({
      where: { projectId },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  /**
   * Calculate revenue from production data using the tariff rate
   */
  async calculateRevenue(
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ totalKwh: number; ratePerKwh: number; totalRevenue: number; currency: string } | null> {
    // Get production data for the period
    const production = await prisma.productionData.aggregate({
      where: {
        projectId,
        recordedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { energyProduced: true },
    });

    const totalKwh = Number(production._sum.energyProduced || 0);
    if (totalKwh === 0) return null;

    // Get the active tariff rate
    const tariff = await this.getActiveRate(projectId);
    if (!tariff) return null;

    const ratePerKwh = Number(tariff.ratePerKwh);
    const totalRevenue = totalKwh * ratePerKwh;

    return {
      totalKwh,
      ratePerKwh,
      totalRevenue,
      currency: tariff.currency,
    };
  }
}

export const tariffService = TariffService.getInstance();
export default tariffService;
