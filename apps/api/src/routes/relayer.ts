/**
 * Admin Relayer Routes
 * 
 * Endpoints for managing the admin relayer wallet that sponsors user transactions.
 */

import { Router, Response } from "express";
import { getRelayerService } from "@aethera/stellar";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// All relayer routes require admin authentication
router.use(authenticate);
router.use(requireRole("ADMIN"));

/**
 * Get relayer wallet information
 */
router.get("/wallet", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const relayer = getRelayerService();
    await relayer.initialize();
    const walletInfo = await relayer.getWalletInfo();

    if (!walletInfo) {
      return res.status(404).json({
        success: false,
        error: "Relayer wallet not configured",
        message: "Set ADMIN_RELAYER_PUBLIC_KEY and ADMIN_RELAYER_SECRET_ENCRYPTED in environment",
      });
    }

    res.json({
      success: true,
      data: walletInfo,
    });
  } catch (error: any) {
    console.error("[Relayer API] Error getting wallet info:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get wallet info",
    });
  }
});

/**
 * Fund relayer from testnet friendbot (testnet only)
 */
router.post("/fund/friendbot", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const network = process.env.STELLAR_NETWORK || "testnet";
    
    if (network !== "testnet") {
      return res.status(400).json({
        success: false,
        error: "Friendbot is only available on testnet",
      });
    }

    const relayer = getRelayerService();
    const success = await relayer.fundFromFriendbot();

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to fund from friendbot",
      });
    }

    // Get updated balance
    const walletInfo = await relayer.getWalletInfo();

    res.json({
      success: true,
      message: "Relayer funded from friendbot",
      data: walletInfo,
    });
  } catch (error: any) {
    console.error("[Relayer API] Error funding from friendbot:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fund from friendbot",
    });
  }
});

/**
 * Get recent relayer transactions
 */
router.get("/transactions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const relayer = getRelayerService();
    await relayer.initialize();
    const transactions = await relayer.getRecentTransactions(limit);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error("[Relayer API] Error getting transactions:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get transactions",
    });
  }
});

/**
 * Check if relayer is ready (has sufficient funds)
 */
router.get("/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const relayer = getRelayerService();
    await relayer.initialize();
    const isReady = await relayer.isReady();
    const walletInfo = await relayer.getWalletInfo();

    res.json({
      success: true,
      data: {
        isReady,
        publicKey: walletInfo?.publicKey || null,
        xlmBalance: walletInfo?.xlmBalance || "0",
        minBalanceRequired: "10",
      },
    });
  } catch (error: any) {
    console.error("[Relayer API] Error checking status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check status",
    });
  }
});

/**
 * Generate a new encrypted secret for relayer setup
 * Utility endpoint for initial configuration
 */
router.post("/generate-credentials", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { secretKey } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({
        success: false,
        error: "Secret key required in request body",
      });
    }

    // Validate it's a valid Stellar secret
    try {
      const { Keypair } = await import("@stellar/stellar-sdk");
      const keypair = Keypair.fromSecret(secretKey);
      
      const relayer = getRelayerService();
      const encryptedSecret = relayer.encryptSecret(secretKey);

      res.json({
        success: true,
        data: {
          publicKey: keypair.publicKey(),
          encryptedSecret,
          envVars: {
            ADMIN_RELAYER_PUBLIC_KEY: keypair.publicKey(),
            ADMIN_RELAYER_SECRET_ENCRYPTED: encryptedSecret,
          },
        },
        message: "Add these to your .env file",
      });
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid Stellar secret key",
      });
    }
  } catch (error: any) {
    console.error("[Relayer API] Error generating credentials:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate credentials",
    });
  }
});

export default router;
