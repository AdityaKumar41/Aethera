// ============================================
// Investment Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import { prisma, InvestmentStateMachine, AuditLogger } from "@aethera/database";
import { MIN_INVESTMENT_AMOUNT, MAX_INVESTMENT_AMOUNT } from "@aethera/config";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { requireTrustline } from "../middleware/trustline.js";
import { getInvestmentService } from "../services/investmentService.js";

const router = Router();

// Require authentication for all investment routes
router.use(authenticate);

// ============================================
// Create Investment (Real On-Chain Flow)
// ============================================

const createInvestmentSchema = z.object({
  projectId: z.string(),
  amount: z.number().min(MIN_INVESTMENT_AMOUNT).max(MAX_INVESTMENT_AMOUNT),
});

router.post(
  "/",
  requireRole("INVESTOR"),
  requireTrustline, // Verify USDC trustline before allowing investment
  async (req: AuthenticatedRequest, res, next) => {
    try {
      console.log("\n🔵 INVESTMENT REQUEST STARTED");
      console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
      console.log("👤 User ID:", req.auth?.userId);

      const data = createInvestmentSchema.parse(req.body);
      console.log("✅ Schema validation passed:", data);

      const investorId = req.auth?.userId!;

      // Check KYC status first
      console.log("🔍 Checking KYC status for investor:", investorId);
      const investor = await prisma.user.findUnique({
        where: { id: investorId },
        select: { kycStatus: true },
      });
      console.log("📋 KYC Status:", investor?.kycStatus);

      if (!investor || investor.kycStatus !== "VERIFIED") {
        return res.status(403).json({
          success: false,
          error: "KYC verification required before investing",
          code: "KYC_REQUIRED",
        });
      }

      // Get project and calculate tokens
      console.log("🔍 Fetching project:", data.projectId);
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });
      console.log(
        "📊 Project found:",
        project ? `${project.name} (${project.status})` : "NULL",
      );

      if (!project) {
        console.error("❌ Project not found:", data.projectId);
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "FUNDING") {
        console.error(
          "❌ Project not accepting funding. Status:",
          project.status,
        );
        throw createApiError(
          "Project is not open for funding",
          400,
          "PROJECT_NOT_FUNDABLE",
        );
      }
      console.log("✅ Project is accepting funding");

      // Calculate tokens
      console.log("💰 Calculating tokens:");
      console.log("   Amount:", data.amount, "USDC");
      console.log("   Price per token:", project.pricePerToken);
      const tokenAmount = Math.floor(
        data.amount / Number(project.pricePerToken),
      );
      console.log("   Tokens to receive:", tokenAmount);
      console.log("   Tokens remaining:", project.tokensRemaining);

      if (tokenAmount < 1) {
        console.error(
          "❌ Investment too low. Amount:",
          data.amount,
          "Price:",
          project.pricePerToken,
        );
        throw createApiError(
          "Investment amount too low for at least 1 token",
          400,
        );
      }

      if (tokenAmount > (project.tokensRemaining ?? 0)) {
        console.error(
          "❌ Not enough tokens. Requested:",
          tokenAmount,
          "Available:",
          project.tokensRemaining,
        );
        throw createApiError(
          "Not enough tokens available",
          400,
          "INSUFFICIENT_TOKENS",
        );
      }
      console.log("✅ Token calculation valid");

      // Process investment through the real on-chain service
      console.log("\n🚀 Starting investment service processing...");
      const investmentService = getInvestmentService();
      const result = await investmentService.processInvestment({
        investorId,
        projectId: data.projectId,
        amount: data.amount,
        tokenAmount,
      });
      console.log(
        "📊 Investment service result:",
        JSON.stringify(result, null, 2),
      );

      if (!result.success) {
        console.error("❌ Investment service failed:", result.error);
        return res.status(400).json({
          success: false,
          error: result.error,
          investmentId: result.investmentId,
        });
      }
      console.log("✅ Investment service successful");

      // Update project funding (in transaction)
      await prisma.$transaction(async (tx) => {
        const newFundingRaised = Number(project.fundingRaised) + data.amount;
        const newTokensRemaining = (project.tokensRemaining ?? 0) - tokenAmount;

        await tx.project.update({
          where: { id: data.projectId },
          data: {
            fundingRaised: newFundingRaised,
            tokensRemaining: newTokensRemaining,
            status:
              newFundingRaised >= Number(project.fundingTarget)
                ? "FUNDED"
                : "FUNDING",
          },
        });
      });

      // Get updated investment
      const investment = await prisma.investment.findUnique({
        where: { id: result.investmentId },
        include: {
          project: {
            select: { name: true, tokenSymbol: true },
          },
        },
      });

      // Log investment transition
      await AuditLogger.logInvestmentTransition(
        result.investmentId!,
        "PENDING",
        "PENDING_ONCHAIN",
        investorId,
        {
          projectId: data.projectId,
          amount: data.amount,
          tokenAmount,
          txHash: result.txHash,
        },
      );

      res.status(201).json({
        success: true,
        message: `Investment submitted for ${project.name}`,
        data: {
          ...investment,
          status: "PENDING_ONCHAIN",
          message:
            "Transaction submitted to blockchain. Awaiting confirmation.",
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Investment Status (with on-chain verification)
// ============================================

router.get("/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const investmentService = getInvestmentService();
    const investment = await investmentService.getInvestmentStatus(
      req.params.id,
    );

    if (!investment) {
      throw createApiError("Investment not found", 404);
    }

    if (investment.investorId !== req.auth?.userId) {
      throw createApiError("Not authorized", 403);
    }

    res.json({
      success: true,
      data: {
        id: investment.id,
        status: investment.status,
        txHash: investment.txHash,
        txLedger: investment.txLedger,
        txConfirmedAt: investment.txConfirmedAt,
        mintStatus: investment.mintStatus,
        mintConfirmedAt: investment.mintConfirmedAt,
        amount: investment.amount,
        tokenAmount: investment.tokenAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Cancel Pending Investment
// ============================================

router.post("/:id/cancel", async (req: AuthenticatedRequest, res, next) => {
  try {
    const investmentService = getInvestmentService();
    await investmentService.cancelInvestment(req.params.id, req.auth?.userId!);

    res.json({
      success: true,
      message: "Investment cancelled",
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get My Investments
// ============================================

router.get(
  "/my",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const investments = await prisma.investment.findMany({
        where: { investorId: req.auth?.userId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              tokenSymbol: true,
              status: true,
              expectedYield: true,
              location: true,
              pricePerToken: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: investments });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Single Investment
// ============================================

router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const investment = await prisma.investment.findFirst({
      where: {
        id: req.params.id,
        investorId: req.auth?.userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            tokenSymbol: true,
            status: true,
            expectedYield: true,
            location: true,
          },
        },
      },
    });

    if (!investment) {
      throw createApiError("Investment not found", 404);
    }

    res.json({ success: true, data: investment });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Investment Status (for polling)
// ============================================

router.get("/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const investment = await prisma.investment.findFirst({
      where: {
        id: req.params.id,
        investorId: req.auth?.userId,
      },
      select: {
        id: true,
        status: true,
        mintStatus: true,
        txHash: true,
        mintTxHash: true,
        txConfirmedAt: true,
        mintConfirmedAt: true,
        txError: true,
      },
    });

    if (!investment) {
      throw createApiError("Investment not found", 404);
    }

    res.json({ success: true, data: investment });
  } catch (error) {
    next(error);
  }
});

export default router;
