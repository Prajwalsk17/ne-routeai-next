/**
 * AuraNER / NER-Route AI — Tenant Scoping & Query Isolation Service
 * 
 * Ensures non-SUPER_ADMIN users can never retrieve, inspect, or mutate another organization's records.
 */

import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { ForbiddenError } from '@/lib/api/response';

export interface TenantScopedEntity {
  organization_id?: string | null;
  organizationId?: string | null;
  org_id?: string | null;
  [key: string]: unknown;
}

/**
 * Checks whether an entity is accessible to the user based on tenant membership
 */
export function isTenantAccessible(
  entityOrgId: string | null | undefined,
  user: SessionUser
): boolean {
  if (!user) return false;
  const canonicalRole = normalizeRole(user.role);

  // SUPER_ADMIN has cross-tenant oversight
  if (canonicalRole === 'SUPER_ADMIN') {
    return true;
  }

  // Globally shared public data (e.g. public safe havens, road hazards)
  if (!entityOrgId) {
    return true;
  }

  // Strict tenant match required for tenant-scoped records
  return user.organizationId === entityOrgId;
}

/**
 * Asserts that a user has access to a specific tenant entity, throwing ForbiddenError if violated
 */
export function assertTenantOwnership(
  entityOrgId: string | null | undefined,
  user: SessionUser,
  entityName = 'resource'
): void {
  if (!isTenantAccessible(entityOrgId, user)) {
    throw new ForbiddenError(
      `Tenant access denied. You do not have permission to access this ${entityName} from another organization.`
    );
  }
}

/**
 * Filters an in-memory array of records by tenant membership.
 * Automatically preserves cross-tenant access for SUPER_ADMIN.
 */
export function filterByTenant<T>(
  items: T[],
  user: SessionUser
): T[] {
  if (!user) return [];
  const canonicalRole = normalizeRole(user.role);

  if (canonicalRole === 'SUPER_ADMIN') {
    return items;
  }

  const userOrgId = user.organizationId;
  return items.filter((item) => {
    const record = item as unknown as TenantScopedEntity;
    const orgId = record?.organization_id || record?.organizationId || record?.org_id;
    if (!userOrgId) {
      return !orgId;
    }
    return !orgId || orgId === userOrgId;
  });
}
