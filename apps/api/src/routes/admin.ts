// ============================================
// Admin Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import {
  prisma,
  User,
  KYCStatus,
  ProjectStateMachine,
  AuditLogger,
} from "@aethera/database";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole("ADMIN"));

// ============================================
// Dashboard Stats
// ============================================

router.get("/dashboard", async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalInvestors,
      totalInstallers,
      totalProjects,
      pendingProjects,
      activeProjects,
      pendingKYC,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "INVESTOR" } }),
      prisma.user.count({ where: { role: "INSTALLER" } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { kycStatus: "IN_REVIEW" } }),
    ]);

    // Calculate total funding stats
    const fundingStats = await prisma.project.aggregate({
      _sum: {
        fundingRaised: true,
        fundingTarget: true,
      },
      where: {
        status: { in: ["FUNDING", "FUNDED", "ACTIVE", "COMPLETED"] },
      },
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          investors: totalInvestors,
          installers: totalInstallers,
        },
        projects: {
          total: totalProjects,
          pending: pendingProjects,
          active: activeProjects,
        },
        kyc: {
          pendingReview: pendingKYC,
        },
        funding: {
          totalRaised: Number(fundingStats._sum.fundingRaised || 0),
          totalTarget: Number(fundingStats._sum.fundingTarget || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Pending Projects for Approval
// ============================================

router.get("/projects/pending", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        installer: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Approve Project
// ============================================

router.post(
  "/projects/:id/approve",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "PENDING_APPROVAL") {
        throw createApiError("Project is not pending approval", 400);
      }

      // Validate state transition
      try {
        ProjectStateMachine.validate("PENDING_APPROVAL", "APPROVED", project, {
          adminId: req.auth?.userId,
        });
      } catch (error: any) {
        throw createApiError(error.message, 400, "INVALID_TRANSITION");
      }

      // First transition to APPROVED
      const approved = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: req.auth?.userId,
        },
      });

      // TODO: Deploy Soroban contract here
      // After successful deployment, transition to FUNDING

      // For now, auto-transition to FUNDING (will be async after contract deployment)
      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: { status: "FUNDING" },
      });

      // Log the state transition
      await AuditLogger.logProjectTransition(
        req.params.id,
        "PENDING_APPROVAL",
        "FUNDING",
        req.auth?.userId!,
        { adminAction: "approve", approvedAt: new Date() },
      );

      // TODO: Deploy Soroban token contract for the project

      res.json({
        success: true,
        message: "Project approved and opened for funding",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Reject Project
// ============================================

const rejectSchema = z.object({
  reason: z.string().min(10),
});

router.post(
  "/projects/:id/reject",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = rejectSchema.parse(req.body);

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "PENDING_APPROVAL") {
        throw createApiError("Project is not pending approval", 400);
      }

      // Validate state transition
      try {
        ProjectStateMachine.validate("PENDING_APPROVAL", "REJECTED", project, {
          rejectionReason: reason,
        });
      } catch (error: any) {
        throw createApiError(error.message, 400, "INVALID_TRANSITION");
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
        },
      });

      // Log the state transition
      await AuditLogger.logProjectTransition(
        req.params.id,
        "PENDING_APPROVAL",
        "REJECTED",
        req.auth?.userId!,
        { adminAction: "reject", reason, rejectedAt: new Date() },
      );

      res.json({
        success: true,
        message: "Project rejected",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Activate Project (After Funded)
// ============================================

router.post(
  "/projects/:id/activate",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "FUNDED") {
        throw createApiError("Project must be FUNDED to activate", 400);
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "ACTIVE",
          startDate: new Date(),
        },
      });

      // TODO: Release escrowed funds to installer via Stellar

      res.json({
        success: true,
        message: "Project activated - funds released to installer",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Users with Pending KYC
// ============================================

router.get("/kyc/pending", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { kycStatus: "IN_REVIEW" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        kycSubmittedAt: true,
        kycDocuments: true,
      },
      orderBy: { kycSubmittedAt: "asc" },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Approve KYC
// ============================================

router.post("/kyc/:userId/approve", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
    });

    if (!user) {
      throw createApiError("User not found", 404);
    }

    if (user.kycStatus !== "IN_REVIEW") {
      throw createApiError("User KYC is not in review", 400);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        kycStatus: "VERIFIED",
        kycVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        kycStatus: true,
        kycVerifiedAt: true,
      },
    });

    res.json({
      success: true,
      message: "KYC approved",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Reject KYC
// ============================================

router.post("/kyc/:userId/reject", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
    });

    if (!user) {
      throw createApiError("User not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        kycStatus: "REJECTED",
      },
      select: {
        id: true,
        email: true,
        name: true,
        kycStatus: true,
      },
    });

    res.json({
      success: true,
      message: "KYC rejected",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// All Users
// ============================================

router.get("/users", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;

    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          kycStatus: true,
          stellarPubKey: true,
          createdAt: true,
          _count: {
            select: { investments: true, projects: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
