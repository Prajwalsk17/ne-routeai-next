/**
 * AuraNER / NER-Route AI — Backend Authorization & Multi-Tenancy Enforcement Service
 * 
 * Enforces server-side capability checks, tenant boundaries, and audit logging.
 * NEVER rely exclusively on frontend UI authorization.
 */

import { NextRequest } from 'next/server';
import { getSession, SessionUser } from '@/lib/auth/session';
import {
  Permission,
  SystemRoleCode,
  hasPermission,
  isAuthorized,
  normalizeRole,
} from '@/lib/auth/roles';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { logger } from '@/lib/logger';

export interface AuthorizationContext {
  user: SessionUser;
  isSuperAdmin: boolean;
  activeOrgId: string | null;
}

/**
 * Checks whether the current user has permission to access a specific organization's resources.
 * SUPER_ADMIN has global cross-tenant access for disaster response coordination.
 */
export function canAccessTenant(user: SessionUser, targetOrgId?: string | null): boolean {
  if (!user) return false;
  const canonicalRole = normalizeRole(user.role);

  // SUPER_ADMIN has global cross-tenant visibility
  if (canonicalRole === 'SUPER_ADMIN') {
    return true;
  }

  // Non-super-admins can only access their assigned organization
  if (!targetOrgId || !user.organizationId) {
    return false;
  }

  return user.organizationId === targetOrgId;
}

/**
 * Throws ForbiddenError if user does not have access to the target organization
 */
export function enforceTenantAccess(user: SessionUser, targetOrgId?: string | null): void {
  if (!canAccessTenant(user, targetOrgId)) {
    logger.warn('Tenant access violation attempt', {
      userId: user.id,
      userRole: user.role,
      userOrgId: user.organizationId,
      targetOrgId,
    });
    throw new ForbiddenError('Tenant access denied. Cross-organization access is strictly prohibited.');
  }
}

/**
 * Requires an authenticated user session.
 * Throws UnauthorizedError (HTTP 401) if unauthenticated.
 */
export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const user = await getSession(req);
  if (!user) {
    throw new UnauthorizedError('Authentication required. Please sign in.');
  }
  return user;
}

export const requireAuthenticatedUser = requireAuth;

/**
 * Requires an authenticated user session with a specific permission.
 * Throws UnauthorizedError (HTTP 401) or ForbiddenError (HTTP 403).
 */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<SessionUser> {
  const user = await requireAuth(req);

  if (!hasPermission(user.role, permission)) {
    logger.warn(`Permission denied: [${permission}] for user ${user.id} (${user.role})`, {
      userId: user.id,
      role: user.role,
      permission,
    });
    throw new ForbiddenError(`Forbidden. Missing required permission: ${permission}`);
  }

  return user;
}

/**
 * Requires an authenticated user session with one of the allowed roles.
 * Throws UnauthorizedError (HTTP 401) or ForbiddenError (HTTP 403).
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: (SystemRoleCode | string)[]
): Promise<SessionUser> {
  const user = await requireAuth(req);

  if (!isAuthorized(user.role, allowedRoles as SystemRoleCode[])) {
    logger.warn(`Role access denied for user ${user.id} (${user.role}) on restricted endpoint`, {
      userId: user.id,
      role: user.role,
      allowedRoles,
    });
    throw new ForbiddenError('Forbidden. Insufficient role privileges for this operation.');
  }

  return user;
}

/**
 * Requires an authenticated user session and validates tenant access.
 * Throws UnauthorizedError (HTTP 401) or ForbiddenError (HTTP 403).
 */
export async function requireTenantScope(req: NextRequest, targetOrgId: string): Promise<SessionUser> {
  const user = await requireAuth(req);
  enforceTenantAccess(user, targetOrgId);
  return user;
}

/**
 * Audits sensitive authorization and tenant operations
 */
export async function logAuthorizationEvent(params: {
  userId?: string;
  organizationId?: string | null;
  action: string;
  resource: string;
  status: 'ALLOWED' | 'DENIED';
  reason?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  logger.info(`[RBAC_AUDIT] ${params.status}: ${params.action} on ${params.resource}`, {
    userId: params.userId,
    organizationId: params.organizationId,
    action: params.action,
    resource: params.resource,
    status: params.status,
    reason: params.reason,
    details: params.details,
  });
}
