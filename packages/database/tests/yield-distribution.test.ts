import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { YieldDistributionService } from "../src/yield-distribution";

// Mock dependencies with factory function
vi.mock("../src/index", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

vi.mock("../src/oracle", () => ({
  OracleService: {
    calculateYield: vi.fn(),
  },
}));

vi.mock("../src/audit", () => ({
  AuditLogger: {
    logStateChange: vi.fn(),
  },
}));

const { prisma } = await import("../src/index");
const { OracleService } = await import("../src/oracle");

describe("YieldDistributionService", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    vi.clearAllMocks();
  });

  describe("createDistribution", () => {
    it("should create distribution with claims for all investors", async () => {
      const mockProject = {
        id: "project_123",
        name: "Solar Project",
        status: "ACTIVE",
        totalTokens: 10000,
        tokenSymbol: "SOLAR",
        investments: [
          {
            id: "inv_1",
            investorId: "user_1",
            tokenAmount: 5000,
            investor: {
              id: "user_1",
              name: "User 1",
              email: "user1@test.com",
              stellarPubKey: "GPUB1",
            },
          },
          {
            id: "inv_2",
            investorId: "user_2",
            tokenAmount: 3000,
            investor: {
              id: "user_2",
              name: "User 2",
              email: "user2@test.com",
              stellarPubKey: "GPUB2",
            },
          },
        ],
      };

      const mockYieldCalc = {
        projectId: "project_123",
        energyProduced: 4500,
        revenueGenerated: 540,
        yieldPerToken: 0.0486,
        totalTokens: 10000,
        distributionReady: true,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-01-31"),
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(
        mockProject as any,
      );
      vi.mocked(OracleService.calculateYield).mockResolvedValue(
        mockYieldCalc as any,
      );

      // Mock $transaction to execute the callback with mock tx
      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          const mockTx = {
            yieldDistribution: {
              create: vi.fn().mockResolvedValue({ id: "dist_123" }),
            },
            yieldClaim: {
              create: vi.fn(),
            },
          };
          return callback(mockTx);
        },
      );

      const result = await YieldDistributionService.createDistribution({
        projectId: "project_123",
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-01-31"),
        revenuePerKwh: 0.12,
        platformFeePercent: 10,
        triggeredBy: "admin_123",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("dist_123");
      expect(OracleService.calculateYield).toHaveBeenCalled();
    });

    it("should throw error for non-ACTIVE project", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: "project_123",
        status: "FUNDING",
        investments: [],
      } as any);

      await expect(
        YieldDistributionService.createDistribution({
          projectId: "project_123",
          periodStart: new Date("2026-01-01"),
          periodEnd: new Date("2026-01-31"),
          triggeredBy: "admin_123",
        }),
      ).rejects.toThrow("Cannot distribute yield for project in");
    });
  });

  describe("processClaim", () => {
    it("should process claim and mark as claimed", async () => {
      const updatedClaim = {
        id: "claim_123",
        claimed: true,
        claimedAt: new Date(),
        txHash: "tx_abc123",
        amount: 100,
        investor: {
          name: "Test User",
          email: "test@example.com",
        },
        distribution: {
          project: {
            name: "Solar Project",
          },
        },
      };

      vi.mocked(prisma.yieldClaim.update).mockResolvedValue(
        updatedClaim as any,
      );

      const result = await YieldDistributionService.processClaim(
        "claim_123",
        "tx_abc123",
      );

      expect(result.claimed).toBe(true);
      expect(result.txHash).toBe("tx_abc123");
    });
  });

  describe("calculatePendingYield", () => {
    it("should sum all pending claim amounts", async () => {
      const mockClaims = [
        { id: "claim_1", amount: 100, claimed: false },
        { id: "claim_2", amount: 150, claimed: false },
        { id: "claim_3", amount: 200, claimed: false },
      ];

      vi.mocked(prisma.yieldClaim.findMany).mockResolvedValue(
        mockClaims as any,
      );

      const total =
        await YieldDistributionService.calculatePendingYield("user_123");

      expect(total).toBe(450);
    });

    it("should return 0 when no pending claims", async () => {
      vi.mocked(prisma.yieldClaim.findMany).mockResolvedValue([]);

      const total =
        await YieldDistributionService.calculatePendingYield("user_123");

      expect(total).toBe(0);
    });
  });

  describe("batchClaim", () => {
    it("should process multiple claims successfully", async () => {
      const mockClaim1 = {
        id: "claim_1",
        claimed: true,
        txHash: "tx_1",
        amount: 100,
        distribution: { project: { name: "Project" } },
        investor: { name: "User 1", email: "user1@test.com" },
      };

      const mockClaim2 = {
        id: "claim_2",
        claimed: true,
        txHash: "tx_2",
        amount: 150,
        distribution: { project: { name: "Project" } },
        investor: { name: "User 2", email: "user2@test.com" },
      };

      vi.mocked(prisma.yieldClaim.update)
        .mockResolvedValueOnce(mockClaim1 as any)
        .mockResolvedValueOnce(mockClaim2 as any);

      const result = await YieldDistributionService.batchClaim(
        ["claim_1", "claim_2"],
        ["tx_1", "tx_2"],
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
      const mockClaim = {
        id: "claim_1",
        claimed: true,
        amount: 100,
        distribution: { project: { name: "Project" } },
        investor: { name: "User 1", email: "user1@test.com" },
      };

      vi.mocked(prisma.yieldClaim.update)
        .mockResolvedValueOnce(mockClaim as any)
        .mockRejectedValueOnce(new Error("Transaction failed"));

      const result = await YieldDistributionService.batchClaim(
        ["claim_1", "claim_2"],
        ["tx_1", "tx_2"],
      );

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Transaction failed");
    });

    it("should throw error when array lengths mismatch", async () => {
      await expect(
        YieldDistributionService.batchClaim(["claim_1", "claim_2"], ["tx_1"]),
      ).rejects.toThrow(
        "Number of claim IDs and transaction hashes must match",
      );
    });
  });
});
