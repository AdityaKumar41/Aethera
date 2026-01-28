import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { OracleService } from "../src/oracle";

// Mock the prisma module with a factory function
vi.mock("../src/index", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

const { prisma } = await import("../src/index");

describe("OracleService", () => {
  beforeEach(() => {
    mockReset(prisma as any);
  });

  describe("recordProductionData", () => {
    it("should record production data successfully", async () => {
      const mockProject = {
        id: "project_123",
        status: "ACTIVE",
        estimatedAnnualProduction: 10000,
        totalTokens: 10000,
        productionData: [{ energyProduced: 500 }],
      };

      const mockData = {
        id: "prod_123",
        projectId: "project_123",
        energyProduced: 1250.5,
        recordedAt: new Date(),
        source: "AUTOMATIC",
        verifiedBy: "admin_123",
        createdAt: new Date(),
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(
        mockProject as any,
      );
      vi.mocked(prisma.productionData.create).mockResolvedValue(
        mockData as any,
      );
      vi.mocked(prisma.productionData.aggregate).mockResolvedValue({
        _sum: { energyProduced: 1750.5 },
      } as any);
      vi.mocked(prisma.productionData.count).mockResolvedValue(2);
      vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any);

      const result = await OracleService.recordProductionData({
        projectId: "project_123",
        energyProduced: 1250.5,
        recordedAt: new Date(),
        source: "AUTOMATIC",
        verifiedBy: "admin_123",
      });

      expect(result).toBeDefined();
      expect(prisma.productionData.create).toHaveBeenCalled();
    });

    it("should throw error for project not found", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(
        OracleService.recordProductionData({
          projectId: "nonexistent",
          energyProduced: 1250.5,
          recordedAt: new Date(),
          source: "MANUAL",
          verifiedBy: "admin_123",
        }),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("calculateYield", () => {
    it("should calculate yield correctly", async () => {
      const mockProject = {
        id: "project_123",
        totalTokens: 10000,
        status: "ACTIVE",
        productionData: [
          { energyProduced: 1000 },
          { energyProduced: 1500 },
          { energyProduced: 2000 },
        ],
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(
        mockProject as any,
      );

      const result = await OracleService.calculateYield(
        "project_123",
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        0.12,
      );

      expect(result.energyProduced).toBe(4500); // 1000 + 1500 + 2000
      expect(result.revenueGenerated).toBe(540); // 4500 * 0.12
    });
  });
});
