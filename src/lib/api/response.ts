// =============================================================================
// AuraNER / NER-Route AI — Standardized API Response & Error Handling
// =============================================================================

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

// -----------------------------------------------------------------------------
// AppError Hierarchy
// -----------------------------------------------------------------------------
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Please sign in.') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A resource conflict occurred.') {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please slow down.') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable.') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
  }
}

// -----------------------------------------------------------------------------
// Response Builders
// -----------------------------------------------------------------------------
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponse<T>> {
  const requestId = (meta?.requestId as string) || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined);

  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
        ...meta,
      },
    },
    { status }
  );
}

export function apiError(
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  details?: unknown,
  requestId?: string
): NextResponse<ApiResponse<null>> {
  const resolvedReqId = requestId || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined);

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
        ...(resolvedReqId ? { requestId: resolvedReqId } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...(resolvedReqId ? { requestId: resolvedReqId } : {}),
      },
    },
    { status }
  );
}

export function apiUnauthorized(
  message = 'Authentication required. Please sign in.'
): NextResponse<ApiResponse<null>> {
  return apiError(message, 'UNAUTHORIZED', 401);
}

export function apiForbidden(
  message = 'You do not have permission to perform this action.'
): NextResponse<ApiResponse<null>> {
  return apiError(message, 'FORBIDDEN', 403);
}

export function apiNotFound(
  message = 'The requested resource could not be found.'
): NextResponse<ApiResponse<null>> {
  return apiError(message, 'NOT_FOUND', 404);
}

export function apiValidationError(
  zodError: ZodError
): NextResponse<ApiResponse<null>> {
  const issues = zodError.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));

  return apiError('Validation failed', 'VALIDATION_ERROR', 400, issues);
}

/**
 * Universal error handler for Next.js Route Handlers.
 * Automatically catches AppError, ZodError, or standard Error, logs to structured logger,
 * and formats standard ApiResponse.
 */
export function handleApiError(err: unknown, requestId?: string): NextResponse<ApiResponse<null>> {
  const reqId = requestId || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined);

  if (err instanceof AppError) {
    logger.warn(`Handled AppError [${err.code}]: ${err.message}`, {
      requestId: reqId,
      code: err.code,
      status: err.status,
    });
    return apiError(err.message, err.code, err.status, err.details, reqId);
  }

  if (err instanceof ZodError) {
    return apiValidationError(err);
  }

  // Unhandled / unexpected exception
  logger.error('Unhandled server exception in API route', err, { requestId: reqId });
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : String(err);
  return apiError(message, 'INTERNAL_ERROR', 500, undefined, reqId);
}
