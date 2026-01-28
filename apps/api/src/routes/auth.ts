// ============================================
// Authentication & Sync Routes (Clerk)
// ============================================

import { Router } from 'express';
import { prisma, UserRole } from '@aethera/database';
import { walletService } from '@aethera/stellar';
import { createApiError } from '../middleware/error.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Sync Clerk user with internal database
 * Called by frontend after successful sign-up/login
 */
router.post('/sync', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.auth!;
    const { email, name, role } = req.body;

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
          stellarPubKey: wallet.publicKey,
          stellarSecretEncrypted: wallet.encryptedSecret,
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
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
