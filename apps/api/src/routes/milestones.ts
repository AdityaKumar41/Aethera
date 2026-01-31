import { Router } from "express";
import { z } from "zod";
import { milestoneService } from "../services/milestoneService.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { prisma } from "@aethera/database";

const router = Router();

/**
 * Get milestones for a project
 */
router.get("/project/:projectId", async (req, res, next) => {
  try {
    const milestones = await milestoneService.getProjectMilestones(req.params.projectId);
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all submitted milestones (Admin only)
 */
router.get("/submitted", authenticate, requireRole("ADMIN"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { status: "SUBMITTED" },
      include: { project: true },
      orderBy: { submittedAt: "desc" },
    });
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
});

/**
 * Submit milestone proof (Installers only)
 */
const submitProofSchema = z.object({
  proofDocuments: z.any(),
});

router.post("/:id/submit", authenticate, requireRole("INSTALLER"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { proofDocuments } = submitProofSchema.parse(req.body);

    const result = await milestoneService.submitMilestone({
      milestoneId: id,
      installerId: req.auth?.userId!,
      proofDocuments,
    });

    res.json({ success: true, data: result, message: "Milestone proof submitted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify milestone (Admin only)
 */
router.post("/:id/verify", authenticate, requireRole("ADMIN"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const result = await milestoneService.verifyMilestone({
      milestoneId: id,
      adminId: req.auth?.userId!,
    });

    res.json({ success: true, data: result, message: "Milestone verified and funds released" });
  } catch (error) {
    next(error);
  }
});

/**
 * Reject milestone (Admin only)
 */
const rejectSchema = z.object({
  reason: z.string(),
});

router.post("/:id/reject", authenticate, requireRole("ADMIN"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = rejectSchema.parse(req.body);

    const result = await milestoneService.rejectMilestone({
      milestoneId: id,
      adminId: req.auth?.userId!,
      reason,
    });

    res.json({ success: true, data: result, message: "Milestone rejected" });
  } catch (error) {
    next(error);
  }
});

export default router;
