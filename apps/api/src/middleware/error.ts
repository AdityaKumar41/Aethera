// ============================================
// Error Handling Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Custom API errors
  if (err.statusCode) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}

// Helper to create API errors
export function createApiError(
  message: string, 
  statusCode: number = 400, 
  code?: string
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// Common errors
export const Errors = {
  UNAUTHORIZED: createApiError('Unauthorized', 401, 'UNAUTHORIZED'),
  FORBIDDEN: createApiError('Forbidden', 403, 'FORBIDDEN'),
  NOT_FOUND: createApiError('Resource not found', 404, 'NOT_FOUND'),
  INVALID_CREDENTIALS: createApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS'),
  USER_EXISTS: createApiError('User already exists', 409, 'USER_EXISTS'),
  KYC_REQUIRED: createApiError('KYC verification required', 403, 'KYC_REQUIRED'),
  INSUFFICIENT_FUNDS: createApiError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS'),
  PROJECT_NOT_FUNDABLE: createApiError('Project not available for funding', 400, 'PROJECT_NOT_FUNDABLE'),
};
