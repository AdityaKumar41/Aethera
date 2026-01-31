// ============================================
// Stellar Routes - Blockchain Operations
// ============================================

import { Router } from "express";
import { z } from "zod";
import { Keypair, Asset } from "@stellar/stellar-sdk";
import { prisma } from "@aethera/database";
import {
  walletService,
  stellarClient,
  contractService,
  trustlineService,
  getOrCreateRelayerAccount,
  USDC_ASSET_TESTNET,
} from "@aethera/stellar";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// ============================================
// Network Info (Public)
// ============================================

router.get("/network", async (req, res, next) => {
  try {
    const network = stellarClient.getNetwork();
    const passphrase = stellarClient.getNetworkPassphrase();

    res.json({
      success: true,
      data: {
        network,
        passphrase,
        horizonUrl:
          network === "testnet"
            ? "https://horizon-testnet.stellar.org"
            : "https://horizon.stellar.org",
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// User Wallet Info
// ============================================

router.get(
  "/wallet",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
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
  },
);

// ============================================
// Fund Testnet Account
// ============================================

router.post(
  "/wallet/fund-testnet",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (stellarClient.getNetwork() !== "testnet") {
        throw createApiError("Friendbot only available on testnet", 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { stellarPubKey: true },
      });

      if (!user?.stellarPubKey) {
        throw createApiError("No Stellar wallet found", 400);
      }

      const funded = await stellarClient.fundTestnetAccount(user.stellarPubKey);

      if (!funded) {
        throw createApiError("Failed to fund account via Friendbot", 500);
      }

      res.json({
        success: true,
        message: "Account funded with testnet XLM",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Check USDC Trustline
// ============================================

router.get(
  "/trustline/check",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { stellarPubKey: true },
      });

      if (!user?.stellarPubKey) {
        throw createApiError("No wallet found", 400);
      }

      const accountInfo = await trustlineService.getAccountInfo(
        user.stellarPubKey,
      );

      res.json({
        success: true,
        data: {
          publicKey: user.stellarPubKey,
          exists: accountInfo.exists,
          hasTrustline: accountInfo.hasTrustline,
          xlmBalance: accountInfo.xlmBalance,
          usdcBalance: accountInfo.usdcBalance,
          allTrustlines: accountInfo.trustlines,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Create USDC Trustline
// ============================================

router.post(
  "/trustline/create",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { stellarPubKey: true, stellarSecretEncrypted: true },
      });

      if (!user?.stellarPubKey || !user?.stellarSecretEncrypted) {
        throw createApiError("No wallet found", 400);
      }

      // Check if already has trustline
      const hasTrustline = await trustlineService.hasTrustline(
        user.stellarPubKey,
      );
      if (hasTrustline) {
        res.json({
          success: true,
          message: "USDC trustline already exists",
          data: { txHash: "already_exists" },
        });
        return;
      }

      // Decrypt secret and create trustline
      const secret = walletService.decryptSecret(user.stellarSecretEncrypted);
      const keypair = Keypair.fromSecret(secret);

      const txHash = await trustlineService.createTrustline(keypair);

      res.json({
        success: true,
        message: "USDC trustline created successfully",
        data: { txHash },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Token Balance for Project
// ============================================

router.get(
  "/tokens/:projectId/balance",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
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
        throw createApiError("No wallet found", 400);
      }

      const result = await contractService.getTokenBalance(
        project.tokenContractId,
        user.stellarPubKey,
      );

      res.json({
        success: true,
        data: {
          balance: result?.balance.toString() || "0",
          tokenSymbol: project.tokenSymbol,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Transaction History
// ============================================

router.get(
  "/transactions",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const transactions = await prisma.transactionLog.findMany({
        where: { userId: req.auth?.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Admin: Deploy Token Contract
// ============================================

router.post(
  "/admin/deploy-token/:projectId",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.tokenContractId) {
        throw createApiError("Token contract already deployed", 400);
      }

      // TODO: Implement actual Soroban contract deployment
      // For prototype, mock the contract ID
      const mockContractId = `C${Date.now().toString(16).toUpperCase().padEnd(54, "0")}`;

      const updated = await prisma.project.update({
        where: { id: req.params.projectId },
        data: { tokenContractId: mockContractId },
      });

      res.json({
        success: true,
        message: "Token contract deployed",
        data: {
          contractId: mockContractId,
          tokenSymbol: project.tokenSymbol,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Fund Test USDC (Testnet Only)
// ============================================

router.post(
  "/fund-test-usdc",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Unauthorized", 401);
      }

      // Get user's wallet
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stellarPubKey: true, stellarSecretEncrypted: true },
      });

      if (!user?.stellarPubKey) {
        throw createApiError("Wallet not found", 400);
      }

      const amount = req.body.amount || "100"; // Default to 100 USDC for reliability on low-liquidity DEX

      console.log(
        `💰 Funding ${user.stellarPubKey} with ${amount} Circle Testnet USDC via DEX Swap...`,
      );

      // 1. Get Relayer keypair
      const relayerKeypair = await getOrCreateRelayerAccount();
      const relayerPub = relayerKeypair.publicKey();
      
      const usdcAsset = USDC_ASSET_TESTNET;

      // 2. Ensure User Trustline (if custodial)
      if (user.stellarSecretEncrypted) {
        const userSecret = walletService.decryptSecret(user.stellarSecretEncrypted);
        const userKeypair = Keypair.fromSecret(userSecret);
        
        const hasTrust = await trustlineService.hasTrustline(user.stellarPubKey);
        if (!hasTrust) {
            console.log(`📝 Creating trustline for ${user.stellarPubKey}...`);
            await trustlineService.createTrustline(userKeypair);
        }
      }

      // 3. Swap XLM for USDC via Path Payment
      const relayerAccount = await stellarClient.horizon.loadAccount(relayerPub);
      const { TransactionBuilder, Operation, BASE_FEE, Asset } = await import("@stellar/stellar-sdk");
      
      const swapTx = new TransactionBuilder(relayerAccount, {
        fee: BASE_FEE,
        networkPassphrase: stellarClient.getNetworkPassphrase(),
      })
        .addOperation(
          Operation.pathPaymentStrictReceive({
            sendAsset: Asset.native(),
            sendMax: "5000", // Max 5000 XLM for the swap
            destination: user.stellarPubKey,
            destAsset: usdcAsset,
            destAmount: amount,
            path: [],
          }),
        )
        .setTimeout(30)
        .build();

      swapTx.sign(relayerKeypair);
      const result = await stellarClient.horizon.submitTransaction(swapTx);

      res.json({
        success: true,
        message: `Funded with ${amount} Circle USDC via internal DEX swap`,
        txHash: result.hash,
        issuer: usdcAsset.issuer,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
