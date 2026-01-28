// ============================================
// Oracle Routes - Production Data Management
// ============================================

import { Router } from "express";
import { z } from "zod";
import { prisma, OracleService } from "@aethera/database";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// Require authentication for all oracle routes
router.use(authenticate);

// ============================================
// Record Production Data (Admin Only)
// ============================================

const productionDataSchema = z.object({
  projectId: z.string(),
  energyProduced: z.number().min(0).max(1000000),
  recordedAt: z.string().datetime(),
  source: z.enum(["MANUAL", "AUTOMATIC", "METER"]),
  notes: z.string().optional(),
});

router.post(
  "/production",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = productionDataSchema.parse(req.body);

      // Validate the data
      const validation = OracleService.validateProductionData({
        ...data,
        recordedAt: new Date(data.recordedAt),
        verifiedBy: req.auth?.userId,
      });

      if (!validation.valid) {
        throw createApiError(
          `Validation failed: ${validation.errors.join(", ")}`,
          400,
          "VALIDATION_ERROR",
        );
      }

      // Record the production data
      const record = await OracleService.recordProductionData({
        projectId: data.projectId,
        energyProduced: data.energyProduced,
        recordedAt: new Date(data.recordedAt),
        source: data.source,
        verifiedBy: req.auth?.userId,
        notes: data.notes,
      });

      res.status(201).json({
        success: true,
        message: "Production data recorded successfully",
        data: record,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Bulk Import Production Data (Admin Only)
// ============================================

const bulkImportSchema = z.object({
  entries: z.array(
    z.object({
      projectId: z.string(),
      energyProduced: z.number().min(0),
      recordedAt: z.string().datetime(),
      source: z.enum(["MANUAL", "AUTOMATIC", "METER"]),
      notes: z.string().optional(),
    }),
  ),
});

router.post(
  "/production/bulk",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { entries } = bulkImportSchema.parse(req.body);

      const formattedEntries = entries.map((entry) => ({
        ...entry,
        recordedAt: new Date(entry.recordedAt),
        verifiedBy: req.auth?.userId,
      }));

      const result =
        await OracleService.bulkImportProductionData(formattedEntries);

      res.json({
        success: true,
        message: `Imported ${result.success} records, ${result.failed} failed`,
        data: {
          successCount: result.success,
          failedCount: result.failed,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Project Performance
// ============================================

router.get(
  "/performance/:projectId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const performance = await OracleService.getProjectPerformance(
        req.params.projectId,
      );

      if (!performance) {
        throw createApiError("Project not found", 404);
      }

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Production History
// ============================================

router.get(
  "/production/:projectId/history",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await OracleService.getProductionHistory(
        req.params.projectId,
        limit,
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Calculate Yield for Period
// ============================================

const yieldCalculationSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  revenuePerKwh: z.number().min(0).optional().default(0.12),
});

router.post(
  "/yield/:projectId/calculate",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = yieldCalculationSchema.parse(req.body);

      const yieldCalc = await OracleService.calculateYield(
        req.params.projectId,
        new Date(data.periodStart),
        new Date(data.periodEnd),
        data.revenuePerKwh,
      );

      res.json({
        success: true,
        data: yieldCalc,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Recent Production Data (Admin Dashboard)
// ============================================

router.get(
  "/production/recent",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const recentData = await OracleService.getRecentProductionData(limit);

      res.json({
        success: true,
        data: recentData,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Update Project Performance (Manual Trigger)
// ============================================

router.post(
  "/performance/:projectId/update",
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const performance = await OracleService.updateProjectPerformance(
        req.params.projectId,
      );

      res.json({
        success: true,
        message: "Project performance updated",
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
