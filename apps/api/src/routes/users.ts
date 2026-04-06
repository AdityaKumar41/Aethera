// ============================================
// User Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
import { contractService, getUSDCAsset, walletService } from "@aethera/stellar";
import { impactService } from "../services/impactService.js";
import { ensureUserWallet } from "../services/userWalletService.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { syncKycStatus } from "./kyc.js";

const router = Router();
const USDC_TOKEN_CONTRACT_ID =
  process.env.USDC_CONTRACT_ID ||
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

// All routes require authentication
router.use(authenticate);

// ============================================
// Get User Profile
// ============================================

router.get("/profile", async (req: AuthenticatedRequest, res, next) => {
  try {
    // Sync KYC status inline
    let kycSyncResult = null;
    try {
      kycSyncResult = await syncKycStatus(req.auth!.userId);
    } catch (e) {
      console.error("[User Profile] KYC sync failed:", e);
    }

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
      throw createApiError("User not found", 404);
    }

    res.json({
      success: true,
      data: {
        ...user,
        kycStatus: kycSyncResult?.status || user.kycStatus,
      },
    });
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

router.patch("/profile", async (req: AuthenticatedRequest, res, next) => {
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

router.get("/wallet/balances", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw createApiError("Authentication required", 401);
    }

    const wallet = await ensureUserWallet(userId, { fundOnTestnet: true });

    const supportedUsdcIssuer = getUSDCAsset().issuer;

    const [rawBalances, rawClaimableBalances, funded, sorobanUsdcBalance] = await Promise.all([
      walletService.getBalances(wallet.publicKey),
      walletService.getClaimableBalances(wallet.publicKey),
      Promise.resolve(wallet.funded),
      contractService.getTokenBalance(USDC_TOKEN_CONTRACT_ID, wallet.publicKey),
    ]);

    // Transform and aggregate balances
    const balanceMap = new Map<string, { asset: string; balance: number }>();

    rawBalances.forEach((b: any) => {
      let assetCode =
        b.asset_type === "native" ? "XLM" : b.asset_code || "UNKNOWN";

      if (assetCode === "USDC" && b.asset_issuer !== supportedUsdcIssuer) {
        assetCode = "USDC (unsupported)";
      }

      const balance = parseFloat(b.balance);

      if (balanceMap.has(assetCode)) {
        const existing = balanceMap.get(assetCode)!;
        existing.balance += balance;
      } else {
        balanceMap.set(assetCode, { asset: assetCode, balance });
      }
    });

    balanceMap.set("USDC", {
      asset: "USDC",
      balance: Number(sorobanUsdcBalance?.balance ?? BigInt(0)) / 10_000_000,
    });

    // Convert to array and filter out zero balances
    const balances = Array.from(balanceMap.values())
      .filter((b) => b.balance > 0)
      .map((b) => ({
        asset: b.asset,
        balance: b.balance.toFixed(7), // 7 decimals for Stellar assets
      }));

    const claimableBalances = rawClaimableBalances.map((balance: any) => {
      const [assetCode, assetIssuer] = String(balance.asset || "").split(":");
      const asset =
        assetCode === "USDC" && assetIssuer && assetIssuer !== supportedUsdcIssuer
          ? "USDC (unsupported)"
          : assetCode || balance.asset;

      return {
        ...balance,
        asset,
      };
    });

    res.json({
      success: true,
      data: {
        publicKey: wallet.publicKey,
        balances,
        claimableBalances,
        funded,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Claim Wallet Balances
// ============================================

router.post("/wallet/claim", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { balanceIds } = req.body;

    if (!balanceIds || !Array.isArray(balanceIds) || balanceIds.length === 0) {
      throw createApiError("balanceIds array is required", 400);
    }

    const userId = req.auth?.userId;
    if (!userId) {
      throw createApiError("Authentication required", 401);
    }

    const wallet = await ensureUserWallet(userId);

    if (!wallet.encryptedSecret) {
      throw createApiError(
        "Custodial wallet not configured or secret missing. Use the command line script with your secret.",
        400,
      );
    }

    const result = await walletService.claimBalances(
      wallet.encryptedSecret,
      balanceIds,
    );

    if (!result.success) {
      throw createApiError(result.error || "Failed to claim balances", 500);
    }

    res.json({
      success: true,
      message: "Balances claimed successfully",
      txHash: result.txHash,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Wallet Transactions
// ============================================

router.get(
  "/wallet/transactions",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId);

      const transactions = await walletService.getTransactions(wallet.publicKey);
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Fund Wallet (Friendbot - Testnet)
// ============================================

router.post(
  "/wallet/fund/friendbot",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId, { fundOnTestnet: true });
      if (!wallet.funded) {
        throw createApiError("Friendbot funding failed", 500);
      }

      res.json({
        success: true,
        message: "Account funded successfully",
        data: {
          publicKey: wallet.publicKey,
          funded: wallet.funded,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Submit KYC (Mock Implementation)
// ============================================

const kycSubmitSchema = z.object({
  idType: z.enum(["passport", "drivers_license", "national_id"]),
  idNumber: z.string().min(5),
  dateOfBirth: z.string(),
  nationality: z.string(),
});

router.post("/kyc/submit", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = kycSubmitSchema.parse(req.body);

    // Store KYC documents (mock - in real app, would store actual documents)
    const user = await prisma.user.update({
      where: { id: req.auth?.userId },
      data: {
        kycStatus: "IN_REVIEW",
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
      message: "KYC submitted for review",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get KYC Status
// ============================================

router.get("/kyc/status", async (req: AuthenticatedRequest, res, next) => {
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

router.get("/portfolio", async (req: AuthenticatedRequest, res, next) => {
  try {
    const investments = await prisma.investment.findMany({
      where: {
        investorId: req.auth?.userId,
        status: { in: ["CONFIRMED", "PENDING_ONCHAIN"] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            expectedYield: true,
            tokenSymbol: true,
            totalEnergyProduced: true,
            totalTokens: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate portfolio stats
    const totalInvested = investments.reduce(
      (sum: number, inv: any) => sum + Number(inv.amount),
      0,
    );
    const totalTokens = investments.reduce(
      (sum: number, inv: any) => sum + inv.tokenAmount,
      0,
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
      (sum: number, y: any) => sum + Number(y.amount),
      0,
    );

    // Calculate total impact (based on pro-rata share of project production)
    let totalImpactEnergy = 0;
    for (const inv of investments) {
      const projectProduction = Number(inv.project.totalEnergyProduced || 0);
      const totalTokens = Number(inv.project.totalTokens || 1); // Avoid div by zero
      const userShare = inv.tokenAmount / totalTokens;
      totalImpactEnergy += projectProduction * userShare;
    }

    const impact = impactService.getImpactMetrics(totalImpactEnergy);

    res.json({
      success: true,
      data: {
        totalInvested,
        totalTokens,
        pendingYieldAmount,
        investments,
        impact: {
          carbonOffset: impact.carbonOffset,
          treesPlanted: impact.treesPlanted,
          waterSaved: impact.waterSaved,
          cleanEnergy: impact.cleanEnergy,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
