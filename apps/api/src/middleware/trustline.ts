// ============================================
// Trustline Verification Middleware
// ============================================

import { Response, NextFunction } from "express";
import { trustlineService, walletService } from "@aethera/stellar";
import { prisma } from "@aethera/database";
import { createApiError } from "./error";
import type { AuthenticatedRequest } from "./auth";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * Middleware to verify USDC trustline exists before investment
 * Automatically creates trustline if it doesn't exist (for custodial wallets)
 */
export async function requireTrustline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log("\n🔵 ========== TRUSTLINE MIDDLEWARE START ==========");
    const userId = req.auth?.userId;
    console.log("👤 User ID:", userId);

    if (!userId) {
      console.error("❌ No user ID found");
      throw createApiError("Authentication required", 401);
    }

    // Get user's Stellar wallet
    console.log("🔍 Fetching user wallet from database...");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stellarPubKey: true,
        stellarSecretEncrypted: true,
      },
    });
    console.log(
      "💼 Wallet public key:",
      user?.stellarPubKey
        ? `${user.stellarPubKey.slice(0, 10)}...${user.stellarPubKey.slice(-4)}`
        : "NULL",
    );
    console.log("🔐 Encrypted secret exists:", !!user?.stellarSecretEncrypted);

    if (!user?.stellarPubKey) {
      console.error("❌ No wallet found for user");
      throw createApiError(
        "Stellar wallet not found. Please create a wallet first.",
        400,
        "WALLET_NOT_FOUND",
      );
    }

    if (!user.stellarSecretEncrypted) {
      console.error("❌ No encrypted secret found");
      throw createApiError(
        "Wallet secret not found. Please contact support.",
        400,
        "WALLET_SECRET_NOT_FOUND",
      );
    }

    // Check if user has USDC trustline
    console.log("🔍 Checking for USDC trustline...");
    const hasTrustline = await trustlineService.hasTrustline(
      user.stellarPubKey,
    );
    console.log("📋 Has trustline:", hasTrustline);

    if (!hasTrustline) {
      console.log(
        `⚠️  No trustline found - attempting auto-creation for user ${userId}...`,
      );

      try {
        // Decrypt user's secret and create trustline
        console.log("🔓 Decrypting wallet secret...");
        const secret = walletService.decryptSecret(user.stellarSecretEncrypted);
        console.log("✅ Secret decrypted successfully");

        const userKeypair = Keypair.fromSecret(secret);
        console.log("🔑 Keypair created from secret");

        // Create trustline automatically
        console.log("🔗 Creating USDC trustline...");
        const result = await trustlineService.createTrustline(userKeypair);
        console.log(
          "📊 Trustline creation result:",
          JSON.stringify(result, null, 2),
        );
        console.log(`✅ USDC trustline created for user ${userId}`);
      } catch (trustlineError: any) {
        console.error("❌ Failed to create trustline:", trustlineError.message);
        console.error("Stack:", trustlineError.stack);
        throw createApiError(
          "Failed to create USDC trustline. Please try enabling USDC in your wallet settings first.",
          400,
          "TRUSTLINE_CREATION_FAILED",
        );
      }
    } else {
      console.log("✅ USDC trustline already exists");
    }

    // Trustline verified or created - continue
    console.log("✅ ========== TRUSTLINE MIDDLEWARE COMPLETE ==========\n");
    next();
  } catch (error: any) {
    console.error("\n❌ ========== TRUSTLINE MIDDLEWARE FAILED ==========");
    console.error("Error type:", error.constructor?.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Status code:", error.statusCode);
    console.error("Stack:", error.stack);
    console.error("=================================================\n");
    next(error);
  }
}

/**
 * Middleware to check and warn about trustline (non-blocking)
 */
export async function checkTrustline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stellarPubKey: true },
    });

    if (user?.stellarPubKey) {
      const hasTrustline = await trustlineService.hasTrustline(
        user.stellarPubKey,
      );

      // Attach trustline status to request for later use
      (req as any).hasTrustline = hasTrustline;

      if (!hasTrustline) {
        console.warn(`⚠️ User ${userId} does not have USDC trustline set up`);
      }
    }

    next();
  } catch (error) {
    // Non-blocking - just log and continue
    console.error("Error checking trustline:", error);
    next();
  }
}
