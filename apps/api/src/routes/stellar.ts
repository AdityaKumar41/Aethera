// ============================================
// Stellar Routes - Blockchain Operations
// ============================================

import { Router } from "express";
import { z } from "zod";
import { Keypair } from "@stellar/stellar-sdk";
import { prisma } from "@aethera/database";
import {
  walletService,
  stellarClient,
  contractService,
  trustlineService,
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

      const amount = req.body.amount || "10000";

      console.log(
        `💰 Funding ${user.stellarPubKey} with ${amount} test USDC...`,
      );

      // Create temporary issuer and distributor using dynamic import
      const { Keypair, Asset, Operation, TransactionBuilder } =
        await import("@stellar/stellar-sdk");

      const issuerKeypair = Keypair.random();
      const distributorKeypair = Keypair.random();

      // Fund with Friendbot
      await stellarClient.horizon.friendbot(issuerKeypair.publicKey()).call();
      await stellarClient.horizon
        .friendbot(distributorKeypair.publicKey())
        .call();

      // Wait for accounts
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create test USDC asset
      const testUSDC = new Asset("USDC", issuerKeypair.publicKey());

      // Distributor creates trustline
      const distributorAccount = await stellarClient.horizon.loadAccount(
        distributorKeypair.publicKey(),
      );

      const trustlineTx = new TransactionBuilder(distributorAccount, {
        fee: "10000",
        networkPassphrase:
          process.env.STELLAR_NETWORK_PASSPHRASE ||
          "Test SDF Network ; September 2015",
      })
        .addOperation(
          Operation.changeTrust({
            asset: testUSDC,
            limit: "1000000000",
          }),
        )
        .setTimeout(30)
        .build();

      trustlineTx.sign(distributorKeypair);
      await stellarClient.horizon.submitTransaction(trustlineTx);

      // Issue USDC to distributor
      const issuerAccount = await stellarClient.horizon.loadAccount(
        issuerKeypair.publicKey(),
      );

      const issueTx = new TransactionBuilder(issuerAccount, {
        fee: "10000",
        networkPassphrase:
          process.env.STELLAR_NETWORK_PASSPHRASE ||
          "Test SDF Network ; September 2015",
      })
        .addOperation(
          Operation.payment({
            destination: distributorKeypair.publicKey(),
            asset: testUSDC,
            amount: "1000000",
          }),
        )
        .setTimeout(30)
        .build();

      issueTx.sign(issuerKeypair);
      await stellarClient.horizon.submitTransaction(issueTx);

      // Check user's trustline
      const userAccount = await stellarClient.horizon.loadAccount(
        user.stellarPubKey,
      );
      const hasTrustline = userAccount.balances.some(
        (balance: any) =>
          balance.asset_type !== "native" &&
          balance.asset_code === "USDC" &&
          balance.asset_issuer === issuerKeypair.publicKey(),
      );

      // Create trustline if needed
      if (!hasTrustline && user.stellarSecretEncrypted) {
        const userSecret = walletService.decryptSecret(
          user.stellarSecretEncrypted,
        );
        const userKeypair = Keypair.fromSecret(userSecret);

        const userTrustlineTx = new TransactionBuilder(userAccount, {
          fee: "10000",
          networkPassphrase:
            process.env.STELLAR_NETWORK_PASSPHRASE ||
            "Test SDF Network ; September 2015",
        })
          .addOperation(
            Operation.changeTrust({
              asset: testUSDC,
              limit: "922337203685.4775807",
            }),
          )
          .setTimeout(30)
          .build();

        userTrustlineTx.sign(userKeypair);
        await stellarClient.horizon.submitTransaction(userTrustlineTx);
      }

      // Send USDC to user
      const distributorAccountReload = await stellarClient.horizon.loadAccount(
        distributorKeypair.publicKey(),
      );

      const sendTx = new TransactionBuilder(distributorAccountReload, {
        fee: "10000",
        networkPassphrase:
          process.env.STELLAR_NETWORK_PASSPHRASE ||
          "Test SDF Network ; September 2015",
      })
        .addOperation(
          Operation.payment({
            destination: user.stellarPubKey,
            asset: testUSDC,
            amount: amount,
          }),
        )
        .setTimeout(30)
        .build();

      sendTx.sign(distributorKeypair);
      const result = await stellarClient.horizon.submitTransaction(sendTx);

      res.json({
        success: true,
        message: `Funded with ${amount} test USDC`,
        txHash: result.hash,
        issuer: issuerKeypair.publicKey(),
        note: "This is test USDC from a temporary issuer for testing purposes",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
