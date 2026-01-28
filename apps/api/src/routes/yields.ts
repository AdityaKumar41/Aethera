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

      // TODO: In production, initiate Stellar USDC payment
      const txHash = `mock_yield_tx_${Date.now()}`;

      const updated = await YieldDistributionService.processClaim(
        claim.id,
        txHash,
      );

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: "YIELD_CLAIM",
          userId: req.auth?.userId,
          amount: claim.amount,
          txHash,
          status: "SUCCESS",
        },
      });

      res.json({
        success: true,
        message: "Yield claimed successfully",
        data: updated,
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

      // Create distribution using service
      const distribution = await YieldDistributionService.createDistribution({
        projectId: data.projectId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        revenuePerKwh: data.revenuePerKwh,
        platformFeePercent: data.platformFeePercent,
        triggeredBy: req.auth?.userId!,
        notes: data.notes,
      });

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: "YIELD_DISTRIBUTION",
          projectId: data.projectId,
          amount: distribution.totalYield,
          txHash: `pending_distribution_${distribution.id}`,
          status: "PENDING",
          metadata: {
            distributionId: distribution.id,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
          },
        },
      });

      const summary = await YieldDistributionService.getDistributionSummary(
        distribution.id,
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

      // TODO: In production, create single batch payment transaction
      const txHash = `mock_batch_yield_tx_${Date.now()}`;
      const txHashes = claimIds.map(() => txHash);

      // Process batch claim
      const results = await YieldDistributionService.batchClaim(
        claimIds,
        txHashes,
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
          txHash,
          status: "SUCCESS",
          metadata: {
            claimCount: claims.length,
            claimIds,
          },
        },
      });

      res.json({
        success: true,
        message: `Successfully claimed ${results.success} yields`,
        data: {
          ...results,
          totalAmount,
          txHash,
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
