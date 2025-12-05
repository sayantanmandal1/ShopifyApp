import { Response } from 'express';

/**
 * Standard API response interfaces
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: PaginationMetadata;
}

export interface ErrorResponse {
  error: string;
  details?: string | string[];
}

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Send a successful response with data
 * @param res Express response object
 * @param data Response data
 * @param statusCode HTTP status code (default: 200)
 * @param pagination Optional pagination metadata
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  pagination?: PaginationMetadata
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param res Express response object
 * @param error Error message
 * @param statusCode HTTP status code
 * @param details Optional error details
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number,
  details?: string | string[]
): Response {
  const response: ErrorResponse = {
    error,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a validation error response (400)
 * @param res Express response object
 * @param details Validation error details
 */
export function sendValidationError(
  res: Response,
  details: string | string[]
): Response {
  return sendError(res, 'Validation failed', 400, details);
}

/**
 * Send an authentication error response (401)
 * @param res Express response object
 * @param message Optional custom message
 */
export function sendAuthenticationError(
  res: Response,
  message: string = 'Authentication required'
): Response {
  return sendError(res, message, 401);
}

/**
 * Send an authorization error response (403)
 * @param res Express response object
 * @param message Optional custom message
 */
export function sendAuthorizationError(
  res: Response,
  message: string = 'Access denied'
): Response {
  return sendError(res, message, 403);
}

/**
 * Send a not found error response (404)
 * @param res Express response object
 * @param resource Resource type that was not found
 */
export function sendNotFoundError(
  res: Response,
  resource: string = 'Resource'
): Response {
  return sendError(res, `${resource} not found`, 404);
}

/**
 * Send an internal server error response (500)
 * @param res Express response object
 * @param message Optional custom message
 * @param details Optional error details
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error',
  details?: string
): Response {
  return sendError(res, message, 500, details);
}

/**
 * Send an external service error response (502)
 * @param res Express response object
 * @param service Service name
 * @param details Optional error details
 */
export function sendExternalServiceError(
  res: Response,
  service: string = 'External service',
  details?: string
): Response {
  return sendError(res, `${service} error`, 502, details);
}

/**
 * Calculate pagination metadata
 * @param total Total number of items
 * @param page Current page number (1-indexed)
 * @param pageSize Number of items per page
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
): PaginationMetadata {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Parse pagination parameters from query string
 * @param page Page number from query (default: 1)
 * @param pageSize Page size from query (default: 100, max: 100)
 */
export function parsePaginationParams(
  page?: string | number,
  pageSize?: string | number
): { page: number; pageSize: number; skip: number } {
  const parsedPage = Math.max(1, parseInt(String(page || '1'), 10) || 1);
  const parsedPageSize = Math.min(
    100,
    Math.max(1, parseInt(String(pageSize || '100'), 10) || 100)
  );
  const skip = (parsedPage - 1) * parsedPageSize;

  return {
    page: parsedPage,
    pageSize: parsedPageSize,
    skip,
  };
}
