import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError, sendInternalError } from '../utils/response';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: string | string[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: string | string[]) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * External API error class
 */
export class ExternalAPIError extends AppError {
  constructor(
    message: string,
    public service: string,
    public retryAfter?: number
  ) {
    super(message, 502);
    this.name = 'ExternalAPIError';
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Global error handler middleware
 * Requirements: 2.5, 12.4, 14.1, 14.2, 14.3, 14.4
 * 
 * Handles all error types:
 * - Validation errors (400)
 * - Authentication errors (401)
 * - Authorization errors (403)
 * - Not found errors (404)
 * - External API errors (502/503)
 * - Database errors (500)
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Extract context for logging
  const errorContext = {
    error: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    tenantId: (req as any).user?.tenantId,
    userId: (req as any).user?.userId,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
  };

  // Log all errors with context (Requirements: 2.5, 12.4)
  if (err instanceof AppError && err.statusCode < 500) {
    // Client errors - log as warning
    logger.warn('Client error occurred:', errorContext);
  } else {
    // Server errors - log as error with full stack trace
    logger.error('Server error occurred:', errorContext);
  }

  // Handle validation errors (400)
  if (err instanceof ValidationError || err.name === 'ValidationError') {
    sendError(res, err.message, 400, (err as any).details);
    return;
  }

  // Handle authentication errors (401)
  if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
    sendError(res, err.message, 401);
    return;
  }

  // Handle JWT errors (401)
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Token expired', 401);
    return;
  }

  // Handle authorization errors (403)
  if (err instanceof AuthorizationError || err.name === 'AuthorizationError') {
    sendError(res, err.message, 403);
    return;
  }

  // Handle not found errors (404)
  if (err instanceof NotFoundError || err.name === 'NotFoundError') {
    sendError(res, err.message, 404);
    return;
  }

  // Handle external API errors (502/503)
  if (err instanceof ExternalAPIError) {
    const statusCode = err.retryAfter ? 503 : 502;
    const response: any = {
      error: err.message,
      service: err.service,
    };
    if (err.retryAfter) {
      response.retryAfter = err.retryAfter;
      res.setHeader('Retry-After', err.retryAfter.toString());
    }
    res.status(statusCode).json(response);
    return;
  }

  // Handle Shopify API errors as external API errors
  if (err.message && (err.message.includes('Shopify') || err.message.includes('API'))) {
    sendError(res, 'External service error', 502, err.message);
    return;
  }

  // Handle database errors (500)
  if (err instanceof DatabaseError || err.name === 'DatabaseError') {
    sendInternalError(res, 'Database error occurred');
    return;
  }

  // Handle Prisma errors (database errors)
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      sendError(res, 'Resource already exists', 409, 'Duplicate entry');
      return;
    }
    
    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      sendError(res, 'Invalid reference', 400, 'Referenced resource does not exist');
      return;
    }
    
    // Record not found
    if (prismaError.code === 'P2025') {
      sendError(res, 'Resource not found', 404);
      return;
    }

    // Other Prisma errors - treat as database errors
    logger.error('Prisma error:', { code: prismaError.code, meta: prismaError.meta });
    sendInternalError(res, 'Database error occurred');
    return;
  }

  // Handle Prisma connection errors
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientUnknownRequestError'
  ) {
    logger.error('Prisma connection error:', errorContext);
    sendInternalError(res, 'Database connection error');
    return;
  }

  // Handle generic AppError instances
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  // Default to 500 internal server error
  sendInternalError(res, 'Internal server error');
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(res, 'Route not found', 404, `Cannot ${req.method} ${req.path}`);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
