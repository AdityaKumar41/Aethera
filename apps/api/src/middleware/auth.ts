import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@aethera/database';
import { createApiError } from './error.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role?: UserRole;
  };
}

/**
 * Middleware to authenticate requests using Clerk
 * We assume clerkMiddleware is used globally in index.ts
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    
    // Allow mock auth in development
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const mockUserId = req.headers['x-mock-auth-user-id'] as string;
      if (mockUserId) {
        const user = await prisma.user.findUnique({
          where: { id: mockUserId },
          select: { id: true, role: true },
        });
        if (user) {
           req.auth = { userId: user.id, role: user.role };
           return next();
        }
      }
    }

    if (!auth || !auth.userId) {
      throw createApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get role from session claims or database if needed
    // In Clerk, role can be stored in publicMetadata
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      // User exists in Clerk but not in our DB yet
      // This is handled by the /sync route, so we might need to allow it
      // but typical protected routes should require a DB record.
      req.auth = { userId: auth.userId };
    } else {
      req.auth = {
        userId: user.id,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check user roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return next(createApiError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
};

/**
 * Middleware to check KYC status (Mocked for MVP)
 */
export const requireKYC = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isMockKYC = process.env.MOCK_KYC !== 'false'; // Default to true for MVP

    if (isMockKYC) {
      return next();
    }

    if (!req.auth?.userId) {
      throw createApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { kycStatus: true },
    });

    if (!user || user.kycStatus !== 'VERIFIED') {
      throw createApiError('KYC verification required', 403, 'KYC_REQUIRED');
    }

    next();
  } catch (error) {
    next(error);
  }
};
