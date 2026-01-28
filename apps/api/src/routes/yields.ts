// ============================================
// Yield Distribution Routes
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma, ProjectStatus, Prisma } from '@aethera/database';
import { PLATFORM_FEE_PERCENTAGE } from '@aethera/config';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { createApiError } from '../middleware/error.js';

const router = Router();

router.use(authenticate);

// ============================================
// Get Yield History (Investors)
// ============================================

router.get('/history', requireRole('INVESTOR'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const claims = await prisma.yieldClaim.findMany({
      where: { investorId: req.auth?.userId },
      include: {
        distribution: {
          include: {
            project: {
              select: { id: true, name: true, tokenSymbol: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalClaimed = claims
      .filter((c: any) => c.claimed)
      .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

    const totalPending = claims
      .filter((c: any) => !c.claimed)
      .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

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
});

// ============================================
// Claim Yield
// ============================================

router.post('/claim/:claimId', requireRole('INVESTOR'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const claim = await prisma.yieldClaim.findFirst({
      where: {
        id: req.params.claimId,
        investorId: req.auth?.userId,
        claimed: false,
      },
    });

    if (!claim) {
      throw createApiError('Claim not found or already claimed', 404);
    }

    // TODO: In production, initiate Stellar payment

    const updated = await prisma.yieldClaim.update({
      where: { id: claim.id },
      data: {
        claimed: true,
        claimedAt: new Date(),
        txHash: `mock_yield_tx_${Date.now()}`,
      },
    });

    // Log transaction
    await prisma.transactionLog.create({
      data: {
        type: 'YIELD_CLAIM',
        userId: req.auth?.userId,
        amount: claim.amount,
        txHash: updated.txHash!,
        status: 'SUCCESS',
      },
    });

    res.json({
      success: true,
      message: 'Yield claimed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Create Yield Distribution (Admin)
// ============================================

const createDistributionSchema = z.object({
  projectId: z.string(),
  totalRevenue: z.number().positive(),
  period: z.string().datetime(),
});

router.post(
  '/distribute',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createDistributionSchema.parse(req.body);

      // Get project
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw createApiError('Project not found', 404);
      }

      if (project.status !== ProjectStatus.ACTIVE) {
        throw createApiError('Project must be ACTIVE to distribute yields', 400);
      }

      // Calculate fees and yield
      const platformFee = data.totalRevenue * (PLATFORM_FEE_PERCENTAGE / 100);
      const totalYield = data.totalRevenue - platformFee;

      // Get all confirmed investments for this project
      const investments = await prisma.investment.findMany({
        where: {
          projectId: data.projectId,
          status: 'CONFIRMED',
        },
        include: {
          investor: { select: { id: true } },
        },
      });

      if (investments.length === 0) {
        throw createApiError('No investments found for this project', 400);
      }

      // Calculate total tokens
      const totalTokensHeld = investments.reduce((sum: number, inv: any) => sum + inv.tokenAmount, 0);
      const yieldPerToken = totalYield / totalTokensHeld;

      // Create distribution in transaction
      const distribution = await (prisma as any).$transaction(async (tx: any) => {
        // Create distribution record
        const dist = await tx.yieldDistribution.create({
          data: {
            projectId: data.projectId,
            period: new Date(data.period),
            totalRevenue: data.totalRevenue,
            platformFee,
            totalYield,
            yieldPerToken,
            distributed: true,
            distributedAt: new Date(),
            txHash: `mock_dist_tx_${Date.now()}`,
          },
        });

        // Create claims for each investor
        for (const investment of investments) {
          const claimAmount = investment.tokenAmount * yieldPerToken;
          await tx.yieldClaim.create({
            data: {
              distributionId: dist.id,
              investorId: investment.investorId,
              tokenAmount: investment.tokenAmount,
              amount: claimAmount,
            },
          });
        }

        return dist;
      });

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: 'YIELD_DISTRIBUTION',
          projectId: data.projectId,
          amount: totalYield,
          txHash: distribution.txHash!,
          status: 'SUCCESS',
          metadata: {
            investorCount: investments.length,
            yieldPerToken,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: `Yield distributed to ${investments.length} investors`,
        data: {
          distribution,
          investorCount: investments.length,
          yieldPerToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get Project Distributions (Admin/Installer)
// ============================================

router.get('/project/:projectId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const distributions = await prisma.yieldDistribution.findMany({
      where: { projectId: req.params.projectId },
      include: {
        _count: { select: { claims: true } },
      },
      orderBy: { period: 'desc' },
    });

    res.json({ success: true, data: distributions });
  } catch (error) {
    next(error);
  }
});

export default router;
