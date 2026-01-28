// ============================================
// Project Routes
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma, ProjectStatus, Prisma } from '@aethera/database';
import { API_CONFIG, MIN_FUNDING_TARGET, MAX_FUNDING_TARGET, MIN_PROJECT_YIELD, MAX_PROJECT_YIELD } from '@aethera/config';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { createApiError } from '../middleware/error.js';

const router = Router();

// ============================================
// Get Marketplace (Public Projects)
// ============================================

router.get('/marketplace', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || API_CONFIG.pagination.defaultLimit,
      API_CONFIG.pagination.maxLimit
    );
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { status: 'FUNDING' },
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where: { status: 'FUNDING' } }),
    ]);

    const projectsWithStats = projects.map((p: any) => ({
      ...p,
      investorCount: p._count.investments,
      fundingPercentage: Number(p.fundingRaised) / Number(p.fundingTarget) * 100,
      remainingTokens: (p.tokensRemaining ?? 0),
    }));

    res.json({
      success: true,
      data: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Single Project
// ============================================

router.get('/:id', async (req, res, next) => {
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
      throw createApiError('Project not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...project,
        investorCount: project._count.investments,
        fundingPercentage: Number(project.fundingRaised) / Number(project.fundingTarget) * 100,
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
  description: z.string().min(50).max(5000),
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
});

router.post(
  '/',
  authenticate,
  requireRole('INSTALLER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createProjectSchema.parse(req.body);

      // Calculate total tokens
      const totalTokens = Math.floor(data.fundingTarget / data.pricePerToken);

      // Generate token symbol
      const tokenSymbol = `SOL${data.name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;

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
          status: 'PENDING_APPROVAL',
          estimatedCompletionDate: data.estimatedCompletionDate ? new Date(data.estimatedCompletionDate) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Project submitted for approval',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get My Projects (Installers)
// ============================================

router.get(
  '/my/projects',
  authenticate,
  requireRole('INSTALLER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projects = await prisma.project.findMany({
        where: { installerId: req.auth?.userId },
        include: {
          _count: {
            select: { investments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: projects.map((p: any) => ({
          ...p,
          investorCount: p._count.investments,
          fundingPercentage: Number(p.fundingRaised) / Number(p.fundingTarget) * 100,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Update Project (Installers - Draft Only)
// ============================================

const updateProjectSchema = createProjectSchema.partial();

router.patch(
  '/:id',
  authenticate,
  requireRole('INSTALLER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          installerId: req.auth?.userId,
          status: 'DRAFT',
        },
      });

      if (!project) {
        throw createApiError('Project not found or cannot be edited', 404);
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
  }
);

// ============================================
// Submit Project for Approval
// ============================================

router.post(
  '/:id/submit',
  authenticate,
  requireRole('INSTALLER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          installerId: req.auth?.userId,
          status: 'DRAFT',
        },
      });

      if (!project) {
        throw createApiError('Project not found or cannot be submitted', 404);
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: { status: 'PENDING_APPROVAL' },
      });

      res.json({
        success: true,
        message: 'Project submitted for approval',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
