// ============================================
// Trustline Verification Middleware
// ============================================

import { Response, NextFunction } from "express";
import { trustlineService } from "@aethera/stellar";
import { prisma } from "@aethera/database";
import { createApiError } from "./error";
import type { AuthenticatedRequest } from "./auth";

/**
 * Middleware to verify USDC trustline exists before investment
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
      select: { stellarPubKey: true },
    });

    if (!user?.stellarPubKey) {
      throw createApiError(
        "Stellar wallet not found. Please create a wallet first.",
        400,
        "WALLET_NOT_FOUND",
      );
    }

    // Check if user has USDC trustline
    const hasTrustline = await trustlineService.hasTrustline(
      user.stellarPubKey,
    );

    if (!hasTrustline) {
      throw createApiError(
        "USDC trustline required. Please enable USDC in your wallet settings.",
        400,
        "TRUSTLINE_REQUIRED",
      );
    }

    // Trustline verified - continue
    next();
  } catch (error) {
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
