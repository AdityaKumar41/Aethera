// ============================================
// Project Routes
// ============================================

import { Router } from "express";
import { z } from "zod";
import {
  prisma,
  ProjectStatus,
  Prisma,
  ProjectStateMachine,
  AuditLogger,
} from "@aethera/database";
import {
  API_CONFIG,
  MIN_FUNDING_TARGET,
  MAX_FUNDING_TARGET,
  MIN_PROJECT_YIELD,
  MAX_PROJECT_YIELD,
} from "@aethera/config";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// ============================================
// Get Marketplace (Public Projects)
// ============================================

router.get("/marketplace", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || API_CONFIG.pagination.defaultLimit,
      API_CONFIG.pagination.maxLimit,
    );
    const skip = (page - 1) * limit;

    const statusStr = (req.query.status as string)?.toUpperCase();
    let where: Prisma.ProjectWhereInput;

    if (!statusStr || statusStr === 'ALL') {
      where = { 
        status: { 
          in: [
            ProjectStatus.APPROVED, 
            ProjectStatus.FUNDING, 
            ProjectStatus.FUNDED, 
            ProjectStatus.ACTIVE_PENDING_DATA,
            ProjectStatus.ACTIVE, 
            ProjectStatus.COMPLETED
          ] 
        } 
      };
    } else if (statusStr === 'FUNDING') {
      where = { 
        status: { in: [ProjectStatus.APPROVED, ProjectStatus.FUNDING] },
        // Double check it's not actually full due to a missing state transition
        tokensRemaining: { gt: 0 }
      };
    } else if (statusStr === 'FUNDED') {
      where = { 
        OR: [
          { status: ProjectStatus.FUNDED },
          { 
            status: ProjectStatus.FUNDING,
            tokensRemaining: 0
          }
        ]
      };
    } else if (statusStr === 'PRODUCING' || statusStr === 'ACTIVE' || statusStr === 'YIELDING') {
      where = { 
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.ACTIVE_PENDING_DATA, ProjectStatus.COMPLETED] } 
      };
    } else {
      where = { status: statusStr as ProjectStatus };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          installer: {
            select: { id: true, name: true, company: true },
          },
          _count: {
            select: { investments: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);

    const projectsWithStats = projects.map((p: any) => ({
      ...p,
      investorCount: p._count.investments,
      fundingPercentage:
        (Number(p.fundingRaised) / Number(p.fundingTarget)) * 100,
      remainingTokens: p.tokensRemaining ?? 0,
    }));

    res.json({
      success: true,
      data: {
        data: projectsWithStats,
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

// ============================================
// Get Single Project
// ============================================

router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        installer: {
          select: { id: true, name: true, company: true },
        },
        _count: {
          select: { investments: true },
        },
      },
    });

    if (!project) {
      throw createApiError("Project not found", 404);
    }

    res.json({
      success: true,
      data: {
        ...project,
        investorCount: project._count.investments,
        fundingPercentage:
          (Number(project.fundingRaised) / Number(project.fundingTarget)) * 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Create Project (Installers Only)
// ============================================

const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(20).max(5000),
  location: z.string().min(3),
  country: z.string().min(2).max(100),
  capacity: z.number().min(1).max(100000), // kW
  panelType: z.string().optional(),
  inverterType: z.string().optional(),
  estimatedAnnualProduction: z.number().optional(),
  expectedYield: z.number().min(MIN_PROJECT_YIELD).max(MAX_PROJECT_YIELD),
  fundingTarget: z.number().min(MIN_FUNDING_TARGET).max(MAX_FUNDING_TARGET),
  pricePerToken: z.number().min(1).max(10000),
  estimatedCompletionDate: z.string().datetime().optional(),
  fundingModel: z.enum(["FULL_UPFRONT", "MILESTONE_BASED"]).optional(),
});

router.post(
  "/",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check KYC status
      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { kycStatus: true },
      });

      if (!user || user.kycStatus !== "VERIFIED") {
        throw createApiError("KYC verification required before creating projects", 403, "KYC_REQUIRED");
      }

      const data = createProjectSchema.parse(req.body);

      // Calculate total tokens
      const totalTokens = Math.floor(data.fundingTarget / data.pricePerToken);

      // Generate token symbol
      const tokenSymbol = `SOL${data.name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;

      // Validate can transition to PENDING_APPROVAL
      const projectData = {
        name: data.name,
        description: data.description,
        fundingTarget: data.fundingTarget,
        expectedYield: data.expectedYield,
        status: "DRAFT" as ProjectStatus,
      };

      try {
        ProjectStateMachine.validate("DRAFT", "PENDING_APPROVAL", projectData);
      } catch (error: any) {
        throw createApiError(error.message, 400, "VALIDATION_FAILED");
      }

      const project = await prisma.project.create({
        data: {
          installerId: req.auth?.userId!,
          name: data.name,
          description: data.description,
          location: data.location,
          country: data.country,
          capacity: data.capacity,
          panelType: data.panelType,
          inverterType: data.inverterType,
          estimatedAnnualProduction: data.estimatedAnnualProduction,
          expectedYield: data.expectedYield,
          fundingTarget: data.fundingTarget,
          pricePerToken: data.pricePerToken,
          totalTokens,
          tokensRemaining: totalTokens,
          tokenSymbol,
          status: "PENDING_APPROVAL",
          fundingModel: data.fundingModel || "FULL_UPFRONT",
          estimatedCompletionDate: data.estimatedCompletionDate
            ? new Date(data.estimatedCompletionDate)
            : null,
        },
      });

      // If milestone-based, create default milestones
      if (data.fundingModel === "MILESTONE_BASED") {
        const defaultMilestones = [
          { name: "Equipment Procurement", description: "Panels, inverter purchased", order: 1, releasePercentage: 25, verificationMethod: "DOCUMENT" as const },
          { name: "Site Installation", description: "Mechanical and electrical assembly", order: 2, releasePercentage: 35, verificationMethod: "PHOTO" as const },
          { name: "Grid Connection", description: "Utility approval and physical connection", order: 3, releasePercentage: 20, verificationMethod: "DOCUMENT" as const },
          { name: "Commissioning", description: "System power on and performance testing", order: 4, releasePercentage: 10, verificationMethod: "IOT" as const },
          { name: "Operational Start", description: "Final handover and yield start", order: 5, releasePercentage: 10, verificationMethod: "ORACLE" as const },
        ];

        for (const m of defaultMilestones) {
          await prisma.projectMilestone.create({
            data: {
              projectId: project.id,
              name: m.name,
              description: m.description,
              order: m.order,
              releasePercentage: m.releasePercentage,
              releaseAmount: (project.fundingTarget.toNumber() * m.releasePercentage) / 100,
              verificationMethod: m.verificationMethod,
              status: "PENDING",
            },
          });
        }
      }

      // Log the state transition
      await AuditLogger.logProjectTransition(
        project.id,
        "DRAFT",
        "PENDING_APPROVAL",
        req.auth?.userId!,
        { action: "submit_for_approval", projectName: project.name },
      );

      res.status(201).json({
        success: true,
        message: "Project submitted for approval",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get My Projects (Installers)
// ============================================

router.get(
  "/my/projects",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projects = await prisma.project.findMany({
        where: { installerId: req.auth?.userId },
        include: {
          _count: {
            select: { investments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: projects.map((p: any) => ({
          ...p,
          investorCount: p._count.investments,
          fundingPercentage:
            (Number(p.fundingRaised) / Number(p.fundingTarget)) * 100,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Update Project (Installers - Draft Only)
// ============================================

const updateProjectSchema = createProjectSchema.partial();

router.patch(
  "/:id",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          installerId: req.auth?.userId,
          status: "DRAFT",
        },
      });

      if (!project) {
        throw createApiError("Project not found or cannot be edited", 404);
      }

      const data = updateProjectSchema.parse(req.body);

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...data,
          estimatedCompletionDate: data.estimatedCompletionDate
            ? new Date(data.estimatedCompletionDate)
            : undefined,
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// ============================================
// Submit Project for Approval
// ============================================

router.post(
  "/:id/submit",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check KYC status
      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { kycStatus: true },
      });

      if (!user || user.kycStatus !== "VERIFIED") {
        throw createApiError("KYC verification required before submitting projects", 403, "KYC_REQUIRED");
      }

      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          installerId: req.auth?.userId,
          status: "DRAFT",
        },
      });

      if (!project) {
        throw createApiError("Project not found or cannot be submitted", 404);
      }

      // Validate state transition
      try {
        ProjectStateMachine.validate("DRAFT", "PENDING_APPROVAL", project);
      } catch (error: any) {
        throw createApiError(error.message, 400, "INVALID_TRANSITION");
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: { status: "PENDING_APPROVAL" },
      });

      // Log the state transition
      await AuditLogger.logProjectTransition(
        req.params.id,
        "DRAFT",
        "PENDING_APPROVAL",
        req.auth?.userId!,
        { action: "submit_existing_project" },
      );

      res.json({
        success: true,
        message: "Project submitted for approval",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Report Energy Production (Installers)
// ============================================

const reportProductionSchema = z.object({
  energyProduced: z.number().positive(),
  recordedAt: z.string().datetime(),
  notes: z.string().optional(),
});

router.post(
  "/:id/production",
  authenticate,
  requireRole("INSTALLER"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const data = reportProductionSchema.parse(req.body);

      const project = await prisma.project.findFirst({
        where: { id, installerId: req.auth?.userId },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      const production = await prisma.productionData.create({
        data: {
          projectId: id,
          energyProduced: new Prisma.Decimal(data.energyProduced),
          recordedAt: new Date(data.recordedAt),
          source: "MANUAL",
          notes: data.notes,
        },
      });

      // Update project total energy
      await prisma.project.update({
        where: { id },
        data: {
          totalEnergyProduced: {
            increment: new Prisma.Decimal(data.energyProduced),
          },
          lastProductionUpdate: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        message: "Production data recorded successfully",
        data: production,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
