// ============================================
// User Routes
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@aethera/database';
import { walletService } from '@aethera/stellar';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { createApiError } from '../middleware/error.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Get User Profile
// ============================================

router.get('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        stellarPubKey: true,
        phone: true,
        company: true,
        address: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createApiError('User not found', 404);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Update Profile
// ============================================

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
});

router.patch('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.auth?.userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        address: true,
        country: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Wallet Balances
// ============================================

router.get('/wallet/balances', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: { stellarPubKey: true },
    });

    if (!user?.stellarPubKey) {
      res.json({
        success: true,
        data: { balances: [], funded: false },
      });
      return;
    }

    const balances = await walletService.getBalances(user.stellarPubKey);
    const funded = await walletService.isAccountFunded(user.stellarPubKey);

    res.json({
      success: true,
      data: {
        publicKey: user.stellarPubKey,
        balances,
        funded,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Submit KYC (Mock Implementation)
// ============================================

const kycSubmitSchema = z.object({
  idType: z.enum(['passport', 'drivers_license', 'national_id']),
  idNumber: z.string().min(5),
  dateOfBirth: z.string(),
  nationality: z.string(),
});

router.post('/kyc/submit', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = kycSubmitSchema.parse(req.body);

    // Store KYC documents (mock - in real app, would store actual documents)
    const user = await prisma.user.update({
      where: { id: req.auth?.userId },
      data: {
        kycStatus: 'IN_REVIEW',
        kycSubmittedAt: new Date(),
        kycDocuments: data,
      },
      select: {
        id: true,
        kycStatus: true,
        kycSubmittedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'KYC submitted for review',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get KYC Status
// ============================================

router.get('/kyc/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: {
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get User's Investments (Portfolio)
// ============================================

router.get('/portfolio', async (req: AuthenticatedRequest, res, next) => {
  try {
    const investments = await prisma.investment.findMany({
      where: { 
        investorId: req.auth?.userId,
        status: 'CONFIRMED',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            expectedYield: true,
            tokenSymbol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate portfolio stats
    const totalInvested = investments.reduce(
      (sum: number, inv) => sum + Number(inv.amount), 
      0
    );
    const totalTokens = investments.reduce(
      (sum: number, inv) => sum + inv.tokenAmount, 
      0
    );

    // Get pending yields
    const pendingYields = await prisma.yieldClaim.findMany({
      where: {
        investorId: req.auth?.userId,
        claimed: false,
      },
      select: {
        amount: true,
      },
    });

    const pendingYieldAmount = pendingYields.reduce(
      (sum: number, y) => sum + Number(y.amount),
      0
    );

    res.json({
      success: true,
      data: {
        totalInvested,
        totalTokens,
        pendingYieldAmount,
        investments,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
