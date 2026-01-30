// ============================================
// Authentication & Sync Routes (Clerk)
// ============================================

import { Router } from 'express';
import { prisma, UserRole } from '@aethera/database';
import { walletService } from '@aethera/stellar';
import { createApiError } from '../middleware/error.js';
import { syncKycStatus } from './kyc.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Sync Clerk user with internal database
 * Called by frontend after successful sign-up/login or onboarding
 */
router.post('/sync', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.auth!;
    const { email, name, role, company, phone, country } = req.body;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create custodial wallet for new user
      const wallet = await walletService.createWallet();

      // Create user record linked to Clerk ID
      user = await prisma.user.create({
        data: {
          id: userId, // Use Clerk ID as internal ID
          email: email,
          name: name || 'User',
          role: (role as UserRole) || 'INVESTOR',
          company: company,
          phone: phone,
          country: country,
          stellarPubKey: wallet.publicKey,
          stellarSecretEncrypted: wallet.encryptedSecret,
        },
      });
    } else {
      // Update existing user with onboarding data
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || user.name,
          role: (role as UserRole) || user.role,
          company: company || user.company,
          phone: phone || user.phone,
          country: country || user.country,
        },
      });
    }

    res.status(user ? 200 : 201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Sync KYC status in background or inline - inline is safer for frontend consistency
    let kycSyncResult = null;
    try {
      kycSyncResult = await syncKycStatus(req.auth!.userId);
    } catch (e) {
      console.error('[Auth Me] Background KYC sync failed:', e);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stellarPubKey: true,
        kycStatus: true,
        phone: true,
        company: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createApiError('User record not found in database', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...user,
        kycStatus: kycSyncResult?.status || user.kycStatus // Use synced if successful
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
