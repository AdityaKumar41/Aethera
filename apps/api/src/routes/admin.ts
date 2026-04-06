// ============================================
// Admin Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import { prisma, User, KYCStatus, AuditLogger } from "@aethera/database";
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

const adminProjectInclude = {
  installer: {
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      country: true,
      stellarPubKey: true,
    },
  },
  milestones: {
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      releasePercentage: true,
      verificationMethod: true,
      submittedAt: true,
      verifiedAt: true,
      releasedAt: true,
    },
    orderBy: { order: "asc" as const },
  },
  iotDevices: {
    select: {
      id: true,
      publicKey: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 3,
  },
  _count: {
    select: {
      investments: true,
      iotDevices: true,
      milestones: true,
      productionData: true,
    },
  },
};

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
      fundingProjects,
      fundedProjects,
      completedProjects,
      pendingKYC,
      approvedAwaitingDeployment,
      activePendingDataProjects,
      recentProjects,
      recentKycSubmissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "INVESTOR" } }),
      prisma.user.count({ where: { role: "INSTALLER" } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.project.count({ where: { status: "FUNDING" } }),
      prisma.project.count({ where: { status: "FUNDED" } }),
      prisma.project.count({ where: { status: "COMPLETED" } }),
      prisma.user.count({ where: { kycStatus: "IN_REVIEW" } }),
      prisma.project.count({ where: { status: "APPROVED" } }),
      prisma.project.count({ where: { status: "ACTIVE_PENDING_DATA" } }),
      prisma.project.findMany({
        take: 6,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        include: {
          installer: {
            select: {
              id: true,
              name: true,
              company: true,
              email: true,
            },
          },
          _count: {
            select: {
              investments: true,
              iotDevices: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { kycStatus: "IN_REVIEW" },
        take: 5,
        orderBy: { kycSubmittedAt: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          kycSubmittedAt: true,
        },
      }),
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
          approved: approvedAwaitingDeployment,
          active: activeProjects,
          activePendingData: activePendingDataProjects,
          funding: fundingProjects,
          funded: fundedProjects,
          completed: completedProjects,
        },
        kyc: {
          pendingReview: pendingKYC,
        },
        funding: {
          totalRaised: Number(fundingStats._sum.fundingRaised || 0),
          totalTarget: Number(fundingStats._sum.fundingTarget || 0),
        },
        queues: {
          underReview: pendingProjects,
          approvedAwaitingDeployment,
          fundingLive: fundingProjects,
          readyToActivate: fundedProjects,
          activeOperations: activeProjects + activePendingDataProjects,
        },
        recentProjects,
        recentKycSubmissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Pending Projects for Approval
// ============================================

router.get("/projects/all", async (req, res, next) => {
  try {
    const status = (req.query.status as string | undefined)?.toUpperCase();

    const projects = await prisma.project.findMany({
      where:
        status && status !== "ALL"
          ? { status: status as any }
          : undefined,
      include: adminProjectInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: adminProjectInclude,
    });

    if (!project) {
      throw createApiError("Project not found", 404);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

router.get("/projects/pending", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { status: "PENDING_APPROVAL" },
          { status: "APPROVED" },
        ],
      },
      include: adminProjectInclude,
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Projects Ready for Activation (Funded)
// ============================================

router.get("/projects/funded", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "FUNDED" },
      include: adminProjectInclude,
      orderBy: { fundingRaised: "desc" },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Active Projects (for Yield Distribution)
// ============================================

router.get("/projects/active", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ACTIVE_PENDING_DATA", "COMPLETED"] } },
      include: adminProjectInclude,
      orderBy: { startDate: "desc" },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Approve Project
// ============================================

const approveProjectSchema = z.object({
  notes: z.string().optional(),
});

router.post(
  "/projects/:id/approve",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { notes } = approveProjectSchema.parse(req.body);

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "PENDING_APPROVAL") {
        throw createApiError(
          `Project is not pending approval (current status: ${project.status})`,
          400,
        );
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: req.auth?.userId,
          rejectionReason: null,
        },
        include: {
          installer: { select: { id: true, name: true, email: true } },
        },
      });

      await AuditLogger.logProjectTransition(
        req.params.id,
        "PENDING_APPROVAL",
        "APPROVED",
        req.auth?.userId!,
        { notes },
      );

      res.json({
        success: true,
        message: "Project approved successfully",
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

const rejectProjectSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

router.post(
  "/projects/:id/reject",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = rejectProjectSchema.parse(req.body);

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (!["PENDING_APPROVAL", "APPROVED"].includes(project.status)) {
        throw createApiError(
          `Project cannot be rejected in its current state (${project.status})`,
          400,
        );
      }

      const fromStatus = project.status;

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
        },
        include: {
          installer: { select: { id: true, name: true, email: true } },
        },
      });

      await AuditLogger.logProjectTransition(
        req.params.id,
        fromStatus,
        "REJECTED",
        req.auth?.userId!,
        { reason },
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
// Activate Project (Capital Release)
// ============================================

router.post(
  "/projects/:id/activate",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          iotDevices: true,
          milestones: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      if (project.status !== "FUNDED") {
        throw createApiError("Project is not fully funded yet", 400);
      }

      // Enforce IoT connection before activation
      if (project.iotDevices.length === 0) {
        throw createApiError(
          "Cannot activate project: No IoT devices connected. Installer must register a device first.",
          400,
        );
      }

      const { contractService, getContractAddresses, walletService } =
        await import("@aethera/stellar");
      const { Keypair } = await import("@stellar/stellar-sdk");

      const contracts = getContractAddresses();
      const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;

      if (contracts.treasury && encryptedSecret) {
        const adminSecret = walletService.decryptSecret(encryptedSecret);
        const adminKeypair = Keypair.fromSecret(adminSecret);

        if (project.fundingModel === "MILESTONE_BASED") {
          // For milestone-based projects, do NOT release all capital upfront.
          // Capital stays in escrow and is released milestone-by-milestone
          // when admin verifies each milestone via the milestones route.
          console.log(
            `[Admin] Activating MILESTONE_BASED project ${project.id}. ` +
            `Capital stays in escrow — ${project.milestones.length} milestones configured.`,
          );
        } else {
          // FULL_UPFRONT: release all capital to the installer immediately on activation
          console.log(
            `[Admin] Activating FULL_UPFRONT project ${project.id}. Releasing all capital from Treasury...`,
          );

          const releaseResult = await contractService.releaseCapital(
            contracts.treasury,
            adminKeypair,
            project.id,
          );

          if (!releaseResult.success) {
            throw createApiError(
              `On-chain capital release failed: ${releaseResult.error}`,
              500,
            );
          }
          console.log(`[Admin] Capital fully released. Tx: ${releaseResult.txHash}`);
        }
      } else {
        console.warn(
          `[Admin] Skipping on-chain release for project ${project.id}: ` +
          `treasury contract or admin key not configured.`,
        );
      }

      // 2. Transition project to ACTIVE_PENDING_DATA in DB
      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          status: "ACTIVE_PENDING_DATA",
          startDate: new Date(),
        },
      });

      await AuditLogger.logProjectTransition(
        req.params.id,
        "FUNDED",
        "ACTIVE_PENDING_DATA",
        req.auth?.userId!,
        {
          adminAction: "activate",
          activatedAt: new Date(),
          fundingModel: project.fundingModel,
          onChain: !!(contracts.treasury && encryptedSecret),
        },
      );

      const message =
        project.fundingModel === "MILESTONE_BASED"
          ? "Project activated. Capital stays in escrow — release funds per milestone as they are verified."
          : "Project activated and all capital released to installer.";

      res.json({
        success: true,
        message,
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
      data: {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
