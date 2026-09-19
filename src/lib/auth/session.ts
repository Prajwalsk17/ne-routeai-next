import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServiceSupabase } from '@/lib/db/supabase';
import { UserRole, Permission, hasPermission } from '@/lib/auth/roles';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'ner-routeai-secret-key-sih-2024-production';

/**
 * Extracts raw bearer token from Authorization header or Cookie
 */
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieToken = req.cookies.get('ner_token')?.value || req.cookies.get('sb-access-token')?.value;
  return cookieToken || null;
}

/**
 * Resolves current user session from Supabase Auth or JWT fallback
 */
export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  // 1. Attempt Supabase Auth validation if configured
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as UserRole) || 'operator',
          organizationId: user.user_metadata?.organizationId || null,
        };
      }
    } catch {
      // Fall through to JWT fallback
    }
  }

  // 2. Cryptographic JWT verification fallback
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    return {
      id: (decoded.userId as string) || (decoded.sub as string) || '',
      email: (decoded.email as string) || '',
      name: (decoded.name as string) || 'User',
      role: (decoded.role as UserRole) || 'operator',
      organizationId: (decoded.organizationId as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Validates request authentication and optional RBAC permission.
 * Throws or returns typed error payload for API handlers.
 */
export async function authenticateRequestWithPermission(
  req: NextRequest,
  requiredPermission?: Permission
): Promise<{ user: SessionUser | null; error: string | null; status: number }> {
  const user = await getSession(req);
  if (!user) {
    return { user: null, error: 'Authentication required. Please sign in.', status: 401 };
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return {
      user,
      error: `Forbidden. Missing required permission: ${requiredPermission}`,
      status: 403,
    };
  }

  return { user, error: null, status: 200 };
}
