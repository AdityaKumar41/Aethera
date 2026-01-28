// ============================================
// Stellar Routes - Blockchain Operations
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@aethera/database';
import { walletService, stellarClient, contractService } from '@aethera/stellar';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { createApiError } from '../middleware/error.js';

const router = Router();

// ============================================
// Network Info (Public)
// ============================================

router.get('/network', async (req, res, next) => {
  try {
    const network = stellarClient.getNetwork();
    const passphrase = stellarClient.getNetworkPassphrase();

    res.json({
      success: true,
      data: {
        network,
        passphrase,
        horizonUrl: network === 'testnet' 
          ? 'https://horizon-testnet.stellar.org' 
          : 'https://horizon.stellar.org',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// User Wallet Info
// ============================================

router.get('/wallet', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: { stellarPubKey: true },
    });

    if (!user?.stellarPubKey) {
      res.json({
        success: true,
        data: { funded: false, balances: [] },
      });
      return;
    }

    const [funded, balances] = await Promise.all([
      walletService.isAccountFunded(user.stellarPubKey),
      walletService.getBalances(user.stellarPubKey),
    ]);

    res.json({
      success: true,
      data: {
        publicKey: user.stellarPubKey,
        funded,
        balances,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Fund Testnet Account
// ============================================

router.post('/wallet/fund-testnet', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (stellarClient.getNetwork() !== 'testnet') {
      throw createApiError('Friendbot only available on testnet', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: { stellarPubKey: true },
    });

    if (!user?.stellarPubKey) {
      throw createApiError('No Stellar wallet found', 400);
    }

    const funded = await stellarClient.fundTestnetAccount(user.stellarPubKey);

    if (!funded) {
      throw createApiError('Failed to fund account via Friendbot', 500);
    }

    res.json({
      success: true,
      message: 'Account funded with testnet XLM',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Token Balance for Project
// ============================================

router.get('/tokens/:projectId/balance', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { tokenContractId: true, tokenSymbol: true },
    });

    if (!project?.tokenContractId) {
      res.json({
        success: true,
        data: { balance: 0, tokenSymbol: project?.tokenSymbol },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth?.userId },
      select: { stellarPubKey: true },
    });

    if (!user?.stellarPubKey) {
      throw createApiError('No wallet found', 400);
    }

    const result = await contractService.getTokenBalance(
      project.tokenContractId,
      user.stellarPubKey
    );

    res.json({
      success: true,
      data: {
        balance: result?.balance.toString() || '0',
        tokenSymbol: project.tokenSymbol,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Transaction History
// ============================================

router.get('/transactions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const transactions = await prisma.transactionLog.findMany({
      where: { userId: req.auth?.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Admin: Deploy Token Contract
// ============================================

router.post(
  '/admin/deploy-token/:projectId',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
      });

      if (!project) {
        throw createApiError('Project not found', 404);
      }

      if (project.tokenContractId) {
        throw createApiError('Token contract already deployed', 400);
      }

      // TODO: Implement actual Soroban contract deployment
      // For prototype, mock the contract ID
      const mockContractId = `C${Date.now().toString(16).toUpperCase().padEnd(54, '0')}`;

      const updated = await prisma.project.update({
        where: { id: req.params.projectId },
        data: { tokenContractId: mockContractId },
      });

      res.json({
        success: true,
        message: 'Token contract deployed',
        data: {
          contractId: mockContractId,
          tokenSymbol: project.tokenSymbol,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
