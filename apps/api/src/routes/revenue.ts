import { Router } from "express";
import { z } from "zod";
import { 
  authenticate, 
  requireRole, 
  type AuthenticatedRequest 
} from "../middleware/auth.js";
import { revenueService } from "../services/revenueService.js";
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
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
