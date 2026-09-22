import { NextRequest, NextResponse } from 'next/server';
import { UserRole, Permission, hasPermission } from '@/lib/auth/roles';
import { verifyAuthToken, AuthError, TokenExpiredError } from '@/lib/auth/token-verifier';
import { getEnv } from '@/lib/env';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string | null;
}

export const SESSION_COOKIE_NAME = 'ner_session';
export const CLIENT_TOKEN_COOKIE_NAME = 'ner_token';

/**
 * Extracts raw bearer token from Authorization header or Cookies
 */
export function extractToken(req: NextRequest): string | null {
  // 1. Authorization header (Bearer)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. HTTP-only session cookie (highest priority cookie)
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) return sessionCookie;

  // 3. Fallback compatibility cookies
  const clientCookie = req.cookies.get(CLIENT_TOKEN_COOKIE_NAME)?.value || req.cookies.get('sb-access-token')?.value;
  return clientCookie || null;
}

/**
 * Resolves current user session from verified token
 */
export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  try {
    const verified = await verifyAuthToken(token);
    return {
      id: verified.userId,
      email: verified.email,
      name: verified.name,
      role: (verified.role as UserRole) || 'operator',
      organizationId: verified.organizationId || null,
    };
  } catch {
    return null;
  }
}

/**
 * Validates request authentication.
 * Returns SessionUser or null.
 */
export async function authenticateRequest(req: NextRequest): Promise<SessionUser | null> {
  return getSession(req);
}

/**
 * Validates request authentication and optional RBAC permission.
 * Throws or returns typed error payload for API handlers.
 */
export async function authenticateRequestWithPermission(
  req: NextRequest,
  requiredPermission?: Permission
): Promise<{ user: SessionUser | null; error: string | null; status: number }> {
  const token = extractToken(req);
  if (!token) {
    return { user: null, error: 'Authentication required. Please sign in.', status: 401 };
  }

  try {
    const verified = await verifyAuthToken(token);
    const user: SessionUser = {
      id: verified.userId,
      email: verified.email,
      name: verified.name,
      role: (verified.role as UserRole) || 'operator',
      organizationId: verified.organizationId || null,
    };

    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      return {
        user,
        error: `Forbidden. Missing required permission: ${requiredPermission}`,
        status: 403,
      };
    }

    return { user, error: null, status: 200 };
  } catch (err: unknown) {
    if (err instanceof TokenExpiredError) {
      return { user: null, error: 'Session has expired. Please sign in again.', status: 401 };
    }
    if (err instanceof AuthError) {
      return { user: null, error: err.message, status: err.status };
    }
    return { user: null, error: 'Invalid authentication credentials.', status: 401 };
  }
}

/**
 * Attaches secure session cookies to the HTTP response
 */
export function setSessionCookie(res: NextResponse, token: string, maxAge = 86400): void {
  const env = getEnv();
  const isProd = env.APP_ENV === 'production';

  // HTTP-Only session cookie for edge middleware and server endpoints
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  // Client-accessible token cookie for client state synchronization
  res.cookies.set(CLIENT_TOKEN_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

/**
 * Clears session cookies on sign out
 */
export function clearSessionCookie(res: NextResponse): void {
  const env = getEnv();
  const isProd = env.APP_ENV === 'production';

  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  res.cookies.set(CLIENT_TOKEN_COOKIE_NAME, '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}
