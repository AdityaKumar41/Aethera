// ============================================
// Yield Distribution Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import {
  prisma,
  ProjectStatus,
  Prisma,
  YieldDistributionService,
} from "@aethera/database";
import { yieldService } from "../services/yieldService.js";
import { PLATFORM_FEE_PERCENTAGE } from "@aethera/config";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

// ============================================
// Get Yield History (Investors)
// ============================================

router.get(
  "/history",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const claims = await YieldDistributionService.getInvestorClaims(
        req.auth?.userId!,
        { limit: 50 },
      );

      const totalClaimed = await YieldDistributionService.calculateClaimedYield(
        req.auth?.userId!,
      );

      const totalPending = await YieldDistributionService.calculatePendingYield(
        req.auth?.userId!,
      );

      res.json({
        success: true,
        data: {
          claims,
          totalClaimed,
          totalPending,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Claim Yield
// ============================================

router.post(
  "/claim/:claimId",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const claim = await prisma.yieldClaim.findFirst({
        where: {
          id: req.params.claimId,
          investorId: req.auth?.userId,
          claimed: false,
        },
      });

      if (!claim) {
        throw createApiError("Claim not found or already claimed", 404);
      }

      // Process claim through YieldService (Stellar + DB)
      const result = await yieldService.claimYield(claim.id, req.auth?.userId!);

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: "YIELD_CLAIM",
          userId: req.auth?.userId,
          amount: claim.amount,
          txHash: result.txHash,
          status: "SUCCESS",
        },
      });

      res.json({
        success: true,
        message: "Yield claimed successfully",
        data: result.claim,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Create Yield Distribution (Admin)
// ============================================

const createDistributionSchema = z.object({
  projectId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  revenuePerKwh: z.number().positive().optional().default(0.12),
  platformFeePercent: z.number().min(0).max(100).optional().default(10),
  notes: z.string().optional(),
});

router.post(
  "/distribute",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createDistributionSchema.parse(req.body);

      // Create distribution using real YieldService (Stellar + DB)
      const result = await yieldService.distributeYield({
        projectId: data.projectId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        revenuePerKwh: data.revenuePerKwh,
        platformFeePercent: data.platformFeePercent,
        adminId: req.auth?.userId!,
        notes: data.notes,
      });

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: "YIELD_DISTRIBUTION",
          projectId: data.projectId,
          amount: 0, // YieldService will handle actual pro-rata tracking
          txHash: result.txHash || `failed_distribution_${Date.now()}`,
          status: result.txHash ? "SUCCESS" : "FAILED",
          metadata: {
            distributionId: result.distributionId,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
          },
        },
      });

      const summary = await YieldDistributionService.getDistributionSummary(
        result.distributionId,
      );

      res.status(201).json({
        success: true,
        message: `Yield distribution created for ${summary?.investorCount || 0} investors`,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Project Distributions (Admin/Installer)
// ============================================

router.get(
  "/project/:projectId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const distributions =
        await YieldDistributionService.getProjectDistributions(
          req.params.projectId,
          20,
        );

      res.json({ success: true, data: distributions });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Distribution Summary (Admin)
// ============================================

router.get(
  "/distribution/:distributionId",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const summary = await YieldDistributionService.getDistributionSummary(
        req.params.distributionId,
      );

      if (!summary) {
        throw createApiError("Distribution not found", 404);
      }

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Pending Claims (Investor)
// ============================================

router.get(
  "/pending",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const pendingClaims = await YieldDistributionService.getPendingClaims(
        req.auth?.userId!,
      );

      const totalPending = await YieldDistributionService.calculatePendingYield(
        req.auth?.userId!,
      );

      res.json({
        success: true,
        data: {
          claims: pendingClaims,
          totalPending,
          count: pendingClaims.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Batch Claim Multiple Yields (Investor)
// ============================================

const batchClaimSchema = z.object({
  claimIds: z.array(z.string()).min(1).max(50),
});

router.post(
  "/claim/batch",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { claimIds } = batchClaimSchema.parse(req.body);

      // Verify all claims belong to this investor and are unclaimed
      const claims = await prisma.yieldClaim.findMany({
        where: {
          id: { in: claimIds },
          investorId: req.auth?.userId,
          claimed: false,
        },
      });

      if (claims.length === 0) {
        throw createApiError("No valid claims found", 404);
      }

      if (claims.length !== claimIds.length) {
        throw createApiError("Some claims are invalid or already claimed", 400);
      }

      // Process batch claim through YieldService
      const results = await yieldService.batchClaim(
        claimIds,
        req.auth?.userId!
      );

      // Calculate total amount
      const totalAmount = claims.reduce(
        (sum, claim) => sum + Number(claim.amount),
        0,
      );

      // Log batch transaction
      await prisma.transactionLog.create({
        data: {
          type: "YIELD_CLAIM",
          userId: req.auth?.userId,
          amount: totalAmount,
          txHash: (results.details[0] as any)?.txHash || "batch_claim", // For simplicity
          status: "SUCCESS",
          metadata: {
            claimCount: claims.length,
            claimIds,
            results: results.details,
          },
        },
      });

      res.json({
        success: true,
        message: `Successfully claimed ${results.success} yields`,
        data: {
          ...results,
          totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Investor Dashboard Summary
// ============================================

router.get(
  "/summary",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const [allClaims, totalClaimed, totalPending] = await Promise.all([
        YieldDistributionService.getInvestorClaims(req.auth?.userId!, {
          limit: 100,
        }),
        YieldDistributionService.calculateClaimedYield(req.auth?.userId!),
        YieldDistributionService.calculatePendingYield(req.auth?.userId!),
      ]);

      const pendingClaims = allClaims.filter((c) => !c.claimed);
      const claimedClaims = allClaims.filter((c) => c.claimed);

      res.json({
        success: true,
        data: {
          totalClaimed,
          totalPending,
          claimedCount: claimedClaims.length,
          pendingCount: pendingClaims.length,
          totalYield: totalClaimed + totalPending,
          recentClaims: claimedClaims.slice(0, 5),
          pendingClaims: pendingClaims.slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
