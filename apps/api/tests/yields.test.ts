import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import yieldsRouter from "../src/routes/yields.js";

// Mock dependencies
vi.mock("@aethera/database", () => ({
  prisma: {
    yieldClaim: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    transactionLog: {
      create: vi.fn(),
    },
    yieldDistribution: {
      create: vi.fn(),
    },
  },
  YieldDistributionService: {
    getInvestorClaims: vi.fn(),
    calculateClaimedYield: vi.fn(),
    calculatePendingYield: vi.fn(),
    processClaim: vi.fn(),
    createDistribution: vi.fn(),
    getDistributionSummary: vi.fn(),
    getProjectDistributions: vi.fn(),
    getPendingClaims: vi.fn(),
  },
}));

vi.mock("../src/middleware/auth.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.auth = { userId: "user_123", role: "INVESTOR" };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

vi.mock("../src/services/yieldService.js", () => ({
  yieldService: {
    distributeYield: vi.fn(),
    claimYield: vi.fn(),
    batchClaim: vi.fn(),
  },
}));

vi.mock("../src/middleware/rateLimiter.js", () => ({
  claimLimiter: (req: any, res: any, next: any) => next(),
}));

const { YieldDistributionService } = await import("@aethera/database");
const { yieldService } = await import("../src/services/yieldService.js");

describe("Yields API", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/yields", yieldsRouter);
    vi.clearAllMocks();
  });

  describe("GET /api/yields/summary", () => {
    it("should return yield summary for investor", async () => {
      const mockClaims = [
        { id: "claim_1", amount: 100, claimed: true },
        { id: "claim_2", amount: 150, claimed: false },
      ];

      vi.mocked(YieldDistributionService.getInvestorClaims).mockResolvedValue(
        mockClaims as any,
      );
      vi.mocked(
        YieldDistributionService.calculateClaimedYield,
      ).mockResolvedValue(100);
      vi.mocked(
        YieldDistributionService.calculatePendingYield,
      ).mockResolvedValue(150);

      const response = await request(app).get("/api/yields/summary");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalClaimed).toBe(100);
      expect(response.body.data.totalPending).toBe(150);
    });
  });

  describe("GET /api/yields/pending", () => {
    it("should return pending claims for investor", async () => {
      const mockPendingClaims = [
        { id: "claim_1", amount: 150, claimed: false },
        { id: "claim_2", amount: 200, claimed: false },
      ];

      vi.mocked(YieldDistributionService.getPendingClaims).mockResolvedValue(
        mockPendingClaims as any,
      );
      vi.mocked(
        YieldDistributionService.calculatePendingYield,
      ).mockResolvedValue(350);

      const response = await request(app).get("/api/yields/pending");

      expect(response.status).toBe(200);
      expect(response.body.data.claims).toHaveLength(2);
      expect(response.body.data.totalPending).toBe(350);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe("POST /api/yields/distribute", () => {
    it("should create yield distribution (admin)", async () => {
      const mockDistribution = {
        id: "dist_123",
        projectId: "project_123",
        totalYield: 486,
        totalRevenue: 540,
        platformFee: 54,
      };

      const mockSummary = {
        distributionId: "dist_123",
        investorCount: 25,
        claimedCount: 0,
        pendingCount: 25,
      };

      vi.mocked(YieldDistributionService.createDistribution).mockResolvedValue(
        mockDistribution as any,
      );
      vi.mocked(
        YieldDistributionService.getDistributionSummary,
      ).mockResolvedValue(mockSummary as any);
      vi.mocked(yieldService.distributeYield).mockResolvedValue({
        distributionId: "dist_123",
        txHash: "tx_123",
        success: true,
      } as any);

      const response = await request(app).post("/api/yields/distribute").send({
        projectId: "project_123",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
        revenuePerKwh: 0.12,
        platformFeePercent: 10,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.investorCount).toBe(25);
    });
  });
});
