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
import { contractDeploymentService, Keypair } from "@aethera/stellar";

const router = Router();

// Require authentication for all investment routes
router.use(authenticate);

// ============================================
// Create Investment
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
      const data = createInvestmentSchema.parse(req.body);

      // Create investment record
      const investment = await prisma.$transaction(async (tx) => {
        // Get project with lock
        const project = await tx.project.findUnique({
          where: { id: data.projectId },
        });

        if (!project) {
          throw createApiError("Project not found", 404);
        }

        if (project.status !== "FUNDING") {
          throw createApiError(
            "Project is not open for funding",
            400,
            "PROJECT_NOT_FUNDABLE",
          );
        }

        // Calculate tokens
        const tokenAmount = Math.floor(
          data.amount / Number(project.pricePerToken),
        );

        if (tokenAmount < 1) {
          throw createApiError(
            "Investment amount too low for at least 1 token",
            400,
          );
        }

        if (tokenAmount > (project.tokensRemaining ?? 0)) {
          throw createApiError(
            "Not enough tokens available",
            400,
            "INSUFFICIENT_TOKENS",
          );
        }

        // Create investment
        const inv = await tx.investment.create({
          data: {
            investorId: req.auth?.userId!,
            projectId: data.projectId,
            amount: data.amount,
            tokenAmount,
            pricePerToken: project.pricePerToken,
            status: "PENDING",
          },
        });

        // Update project funding
        const newFundingRaised = Number(project.fundingRaised) + data.amount;
        const newTokensRemaining = (project.tokensRemaining ?? 0) - tokenAmount;

        await tx.project.update({
          where: { id: data.projectId },
          data: {
            fundingRaised: newFundingRaised,
            tokensRemaining: newTokensRemaining,
            // Auto-mark as FUNDED if target reached
            status:
              newFundingRaised >= Number(project.fundingTarget)
                ? "FUNDED"
                : "FUNDING",
          },
        });

        return { inv, tokenAmount, project };
      });

      const { inv, tokenAmount, project } = investment;

      // ============================================
      // BLOCKCHAIN INTEGRATION
      // ============================================
      let mintTxHash: string | undefined;
      let investmentStatus: "CONFIRMED" | "FAILED" = "CONFIRMED";

      try {
        // Get investor wallet address
        const investor = await prisma.user.findUnique({
          where: { id: req.auth?.userId },
          select: { stellarPubKey: true },
        });

        if (!investor?.stellarPubKey) {
          throw new Error("Investor wallet not found");
        }

        // Mint tokens on-chain if project has contract deployed
        if (project.tokenContractId) {
          const adminSecret = process.env.STELLAR_ADMIN_SECRET;
          if (!adminSecret) {
            console.error(
              "⚠️ Admin secret not configured, skipping token mint",
            );
          } else {
            try {
              const adminKeypair = Keypair.fromSecret(adminSecret);

              // Mint tokens to investor
              mintTxHash = await contractDeploymentService.mintTokens(
                project.tokenContractId,
                adminKeypair,
                investor.stellarPubKey,
                BigInt(tokenAmount),
              );

              console.log(
                `✅ Minted ${tokenAmount} tokens to ${investor.stellarPubKey}`,
              );
              console.log(`   TX Hash: ${mintTxHash}`);
            } catch (mintError) {
              console.error("Token minting failed:", mintError);
              // Continue with investment record but mark as failed
              investmentStatus = "FAILED";
              mintTxHash = undefined;
            }
          }
        } else {
          console.warn(`⚠️ Project ${project.id} has no contract deployed`);
          mintTxHash = `mock_tx_${Date.now()}`; // Fallback for projects without contracts
        }
      } catch (error) {
        console.error("Blockchain integration error:", error);
        investmentStatus = "FAILED";
      }

      // Update investment with blockchain transaction hash
      const confirmed = await prisma.investment.update({
        where: { id: inv.id },
        data: {
          status: investmentStatus,
          txHash: mintTxHash || `mock_tx_${Date.now()}`,
        },
        include: {
          project: {
            select: { name: true, tokenSymbol: true },
          },
        },
      });

      // Log investment state transition
      await AuditLogger.logInvestmentTransition(
        inv.id,
        "PENDING",
        investmentStatus,
        req.auth?.userId!,
        {
          projectId: data.projectId,
          amount: data.amount,
          tokenAmount,
          txHash: confirmed.txHash,
        },
      );

      // Log transaction
      await prisma.transactionLog.create({
        data: {
          type: "INVESTMENT",
          userId: req.auth?.userId,
          projectId: data.projectId,
          amount: data.amount,
          txHash: confirmed.txHash!,
          status: "SUCCESS",
          metadata: { tokenAmount },
        },
      });

      res.status(201).json({
        success: true,
        message: `Successfully invested in ${confirmed.project.name}`,
        data: confirmed,
      });
    } catch (error) {
      next(error);
    }
  },
);

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

export default router;
