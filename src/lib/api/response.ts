import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
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

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
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
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
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
