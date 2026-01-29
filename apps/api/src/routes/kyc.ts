/**
 * KYC Routes
 * 
 * Handles KYC verification flow with Sumsub integration.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
import {
  SumsubService,
  getSumsubService,
  KYC_LEVELS,
  type WebhookPayload,
} from "@aethera/kyc";

const router = Router();

// ============================================
// Schemas
// ============================================

const startKycSchema = z.object({
  level: z.enum(["basic", "enhanced", "accredited"]).optional().default("basic"),
});

// ============================================
// Routes
// ============================================

/**
 * Start KYC verification flow
 * Returns access token for Sumsub WebSDK
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { level } = startKycSchema.parse(req.body);

    // Map level to Sumsub level name
    const levelMap = {
      basic: KYC_LEVELS.BASIC,
      enhanced: KYC_LEVELS.ENHANCED,
      accredited: KYC_LEVELS.ACCREDITED,
    };

    const sumsubLevel = levelMap[level];
    const sumsubService = getSumsubService();

    // Generate access token for WebSDK
    const accessToken = await sumsubService.generateAccessToken(
      user.id,
      sumsubLevel
    );

    // Update user's KYC status to PENDING if not already started
    if (user.kycStatus === "PENDING") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          kycStatus: "PENDING",
          kycSubmittedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: accessToken.token,
        applicantId: accessToken.userId,
        level: level,
      },
    });
  } catch (error: any) {
    console.error("KYC start error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to start KYC",
    });
  }
});

/**
 * Get current KYC status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const sumsubService = getSumsubService();
    const status = await sumsubService.getApplicantStatus(user.id);

    // Get user's KYC data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        status: dbUser?.kycStatus || "PENDING",
        submittedAt: dbUser?.kycSubmittedAt,
        verifiedAt: dbUser?.kycVerifiedAt,
        sumsub: {
          applicantId: status.applicantId,
          status: status.status,
          reviewAnswer: status.reviewAnswer,
          rejectLabels: status.rejectLabels,
          moderationComment: status.moderationComment,
        },
      },
    });
  } catch (error: any) {
    console.error("KYC status error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get KYC status",
    });
  }
});

/**
 * Reset KYC for re-verification
 * Admin only
 */
router.post("/reset/:userId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { userId } = req.params;

    // Get user's applicant ID
    const sumsubService = getSumsubService();
    const status = await sumsubService.getApplicantStatus(userId);

    if (status.applicantId) {
      await sumsubService.resetApplicant(status.applicantId);
    }

    // Reset in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING",
        kycVerifiedAt: null,
      },
    });

    res.json({
      success: true,
      message: "KYC reset successfully",
    });
  } catch (error: any) {
    console.error("KYC reset error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to reset KYC",
    });
  }
});

/**
 * Sumsub Webhook
 * Called by Sumsub when verification status changes
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-signature"] as string;
    const payload = JSON.stringify(req.body);

    const sumsubService = getSumsubService();

    // Verify webhook signature
    if (!sumsubService.verifyWebhookSignature(payload, signature)) {
      console.error("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const webhook: WebhookPayload = req.body;
    console.log("Sumsub webhook received:", webhook.type, webhook.externalUserId);

    // Map webhook to KYC status
    const kycStatus = sumsubService.mapWebhookToKycStatus(webhook);

    // Update user in database
    const updateData: any = {
      kycStatus,
    };

    if (kycStatus === "VERIFIED") {
      updateData.kycVerifiedAt = new Date();
    }

    // Store review details
    if (webhook.reviewResult) {
      updateData.kycDocuments = {
        applicantId: webhook.applicantId,
        reviewAnswer: webhook.reviewResult.reviewAnswer,
        rejectLabels: webhook.reviewResult.rejectLabels,
        moderationComment: webhook.reviewResult.moderationComment,
        reviewedAt: webhook.createdAt,
      };
    }

    await prisma.user.update({
      where: { id: webhook.externalUserId },
      data: updateData,
    });

    console.log(`User ${webhook.externalUserId} KYC status updated to ${kycStatus}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Still return 200 to prevent retries for known errors
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Get KYC requirements for a user's role
 */
router.get("/requirements", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Define requirements based on role
    const requirements = {
      INVESTOR: {
        level: "basic",
        documents: ["Government ID", "Selfie"],
        additionalForLargeInvestments: ["Proof of Address", "Source of Funds"],
      },
      INSTALLER: {
        level: "enhanced",
        documents: ["Government ID", "Selfie", "Business Registration"],
        additionalDocuments: ["Tax ID", "Business Address Proof"],
      },
      ADMIN: {
        level: "enhanced",
        documents: ["Government ID", "Selfie"],
      },
    };

    res.json({
      success: true,
      data: requirements[user.role as keyof typeof requirements] || requirements.INVESTOR,
    });
  } catch (error: any) {
    console.error("KYC requirements error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get requirements",
    });
  }
});

export default router;
