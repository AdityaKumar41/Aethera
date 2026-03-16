// ============================================
// Trustline Verification Middleware
// ============================================

import { Response, NextFunction } from "express";
import { trustlineService, walletService } from "@aethera/stellar";
import { prisma } from "@aethera/database";
import { createApiError } from "./error.js";
import type { AuthenticatedRequest } from "./auth.js";
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
    const userId = req.auth?.userId;

    if (!userId) {
      throw createApiError("Authentication required", 401);
    }

    // Get user's Stellar wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stellarPubKey: true,
        stellarSecretEncrypted: true,
      },
    });

    if (!user?.stellarPubKey) {
      throw createApiError(
        "Stellar wallet not found. Please create a wallet first.",
        400,
        "WALLET_NOT_FOUND",
      );
    }

    if (!user.stellarSecretEncrypted) {
      throw createApiError(
        "Wallet secret not found. Please contact support.",
        400,
        "WALLET_SECRET_NOT_FOUND",
      );
    }

    // Check if user has USDC trustline
    const hasTrustline = await trustlineService.hasTrustline(
      user.stellarPubKey,
    );

    if (!hasTrustline) {
      console.log(
        `Trustline missing for user ${userId}, attempting auto-creation`,
      );

      try {
        const secret = walletService.decryptSecret(user.stellarSecretEncrypted);
        const userKeypair = Keypair.fromSecret(secret);
        const result = await trustlineService.createTrustline(userKeypair);
        console.log(`Trustline created for user ${userId}, tx: ${result}`);
      } catch (trustlineError: any) {
        console.error(
          `Trustline creation failed for user ${userId}:`,
          trustlineError.message,
        );
        throw createApiError(
          "Failed to create USDC trustline. Please try enabling USDC in your wallet settings first.",
          400,
          "TRUSTLINE_CREATION_FAILED",
        );
      }
    }

    next();
  } catch (error: any) {
    console.error(
      `Trustline middleware error for ${req.auth?.userId}:`,
      error.message,
    );
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
        console.warn(`User ${userId} does not have USDC trustline set up`);
      }
    }

    next();
  } catch (error) {
    // Non-blocking - just log and continue
    console.error("Error checking trustline:", error);
    next();
  }
}
