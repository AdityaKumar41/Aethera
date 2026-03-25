import { Router } from "express";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { revenueService } from "../services/revenueService.js";
import { tariffService } from "../services/tariffService.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// ============================================
// Revenue Reporting (Installer Only)
// ============================================

const reportRevenueSchema = z.object({
  projectId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USDC"),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  evidence: z.any().optional(),
  autoDistribute: z.boolean().default(true),
});

router.post(
  "/report",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = reportRevenueSchema.parse(req.body);

      const result = await revenueService.reportRevenue({
        ...data,
        installerId: req.auth?.userId!,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
      });

      res.status(201).json({
        success: true,
        message: data.autoDistribute
          ? "Revenue reported and yield distribution triggered successfully"
          : "Revenue reported successfully",
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Revenue History (Project Owner / Admin)
// ============================================

router.get(
  "/project/:projectId",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { projectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await revenueService.getRevenueHistory(projectId, {
        limit,
        offset,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Single Report Detail
// ============================================

router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await revenueService.getRevenueReport(req.params.id);
      if (!report)
        return res
          .status(404)
          .json({ success: false, error: "Report not found" });
      res.json({ success: true, data: report });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Revenue Summary
// ============================================

router.get(
  "/summary/:projectId",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const summary = await revenueService.getRevenueSummary(
        req.params.projectId,
      );
      res.json({ success: true, data: summary });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Admin: Review Revenue Report
// ============================================

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

router.post(
  "/:id/review",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = reviewSchema.parse(req.body);

      const result = await revenueService.reviewRevenue({
        reportId: req.params.id,
        reviewerId: req.auth?.userId!,
        ...data,
      });

      res.json({
        success: true,
        message: `Revenue report ${data.status.toLowerCase()}`,
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Admin: Pending Reports
// ============================================

router.get(
  "/admin/pending",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await revenueService.getPendingReports({ limit, offset });
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Tariff Configuration
// ============================================

const setTariffSchema = z.object({
  projectId: z.string(),
  ratePerKwh: z.number().positive(),
  currency: z.string().default("USDC"),
  ppaContractRef: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  notes: z.string().optional(),
});

router.post(
  "/tariff",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = setTariffSchema.parse(req.body);

      const tariff = await tariffService.setTariff({
        ...data,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo
          ? new Date(data.effectiveTo)
          : undefined,
      });

      res.status(201).json({
        success: true,
        message: "Tariff rate configured",
        data: tariff,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

router.get(
  "/tariff/:projectId",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const [active, history] = await Promise.all([
        tariffService.getActiveRate(req.params.projectId),
        tariffService.getTariffHistory(req.params.projectId),
      ]);

      res.json({
        success: true,
        data: { active, history },
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// ============================================
// Auto-Calculate Revenue from Tariff + Production
// ============================================

const calculateSchema = z.object({
  projectId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

router.post(
  "/calculate",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = calculateSchema.parse(req.body);

      const result = await tariffService.calculateRevenue(
        data.projectId,
        new Date(data.periodStart),
        new Date(data.periodEnd),
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "No production data or tariff found for this period",
        });
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;
