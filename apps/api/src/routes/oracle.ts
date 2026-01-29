/**
 * Oracle API Routes
 * 
 * Endpoints for oracle provider management and signed data submission.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { oracleService } from "../services/oracleService.js";

const router = Router();

// ============================================
// Oracle Provider Registration (Public)
// ============================================

const registerProviderSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  contactEmail: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
});

router.post("/providers/register", async (req, res, next) => {
  try {
    const data = registerProviderSchema.parse(req.body);
    
    const result = await oracleService.registerProvider(data);
    
    res.status(201).json({
      success: true,
      message: "Provider registered. Awaiting admin approval.",
      data: {
        providerId: result.providerId,
        apiKey: result.apiKey, // Only returned once!
        publicKey: result.publicKey,
      },
      warning: "Store the API key securely. It cannot be retrieved again.",
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Admin: Approve/Suspend Providers
// ============================================

router.post(
  "/providers/:id/approve",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await oracleService.approveProvider(req.params.id, req.auth?.userId!);
      
      res.json({
        success: true,
        message: "Provider approved",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/providers/:id/suspend",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = req.body;
      await oracleService.suspendProvider(req.params.id, reason || "Suspended by admin");
      
      res.json({
        success: true,
        message: "Provider suspended",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// List Providers (Admin)
// ============================================

router.get(
  "/providers",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { status } = req.query;
      
      const providers = await prisma.oracleProvider.findMany({
        where: status ? { status: status as any } : undefined,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          trustScore: true,
          totalSubmissions: true,
          disputedSubmissions: true,
          createdAt: true,
          approvedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      
      res.json({ success: true, data: providers });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Top Providers (Public)
// ============================================

router.get("/providers/top", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const providers = await oracleService.getTopProviders(limit);
    
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Submit Signed Data (Oracle API Key Auth)
// ============================================

const submitDataSchema = z.object({
  data: z.object({
    projectId: z.string(),
    energyProduced: z.number().positive(),
    recordedAt: z.string().datetime(),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
  }),
  signature: z.string(),
  timestamp: z.number(),
  nonce: z.string(),
});

router.post("/submit", async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers["x-oracle-api-key"] as string;
    if (!apiKey) {
      throw createApiError("Missing X-Oracle-API-Key header", 401);
    }
    
    const submission = submitDataSchema.parse(req.body);
    
    const result = await oracleService.submitSignedData(apiKey, {
      data: {
        ...submission.data,
        recordedAt: new Date(submission.data.recordedAt),
        periodStart: submission.data.periodStart ? new Date(submission.data.periodStart) : undefined,
        periodEnd: submission.data.periodEnd ? new Date(submission.data.periodEnd) : undefined,
      },
      signature: submission.signature,
      timestamp: submission.timestamp,
      nonce: submission.nonce,
    });
    
    if (!result.success) {
      throw createApiError(result.error || "Submission failed", 400);
    }
    
    res.status(201).json({
      success: true,
      message: "Data submitted successfully",
      dataId: result.dataId,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// File Dispute (Authenticated)
// ============================================

const fileDisputeSchema = z.object({
  productionDataId: z.string(),
  reason: z.string().min(20).max(2000),
  evidence: z.record(z.any()).optional(),
});

router.post(
  "/disputes",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = fileDisputeSchema.parse(req.body);
      
      const disputeId = await oracleService.fileDispute(req.auth?.userId!, data);
      
      res.status(201).json({
        success: true,
        message: "Dispute filed successfully",
        disputeId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Resolve Dispute (Admin)
// ============================================

const resolveDisputeSchema = z.object({
  valid: z.boolean(),
  notes: z.string().min(10).max(2000),
  trustScoreChange: z.number().min(-10).max(10).optional(),
});

router.post(
  "/disputes/:id/resolve",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = resolveDisputeSchema.parse(req.body);
      
      await oracleService.resolveDispute(req.params.id, req.auth?.userId!, data);
      
      res.json({
        success: true,
        message: `Dispute resolved as ${data.valid ? "valid" : "invalid"}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// List Disputes (Admin)
// ============================================

router.get(
  "/disputes",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { status } = req.query;
      
      const disputes = await prisma.oracleDispute.findMany({
        where: status ? { status: status as any } : undefined,
        include: {
          oracleProvider: {
            select: { name: true, trustScore: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      
      res.json({ success: true, data: disputes });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get Provider Stats (Public)
// ============================================

router.get("/providers/:id/stats", async (req, res, next) => {
  try {
    const provider = await prisma.oracleProvider.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        trustScore: true,
        totalSubmissions: true,
        disputedSubmissions: true,
        status: true,
        createdAt: true,
      },
    });
    
    if (!provider) {
      throw createApiError("Provider not found", 404);
    }
    
    // Calculate dispute ratio
    const disputeRatio = provider.totalSubmissions > 0
      ? (provider.disputedSubmissions / provider.totalSubmissions * 100).toFixed(2)
      : "0.00";
    
    res.json({
      success: true,
      data: {
        ...provider,
        disputeRatio: `${disputeRatio}%`,
        reliability: provider.trustScore >= 70 ? "HIGH" : provider.trustScore >= 40 ? "MEDIUM" : "LOW",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
