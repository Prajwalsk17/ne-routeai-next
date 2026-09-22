'use client';

import React, { ReactNode } from 'react';
import { useStore } from '@/lib/store';
import {
  Permission,
  SystemRoleCode,
  UserRole,
  hasPermission,
  isAuthorized,
  normalizeRole,
} from '@/lib/auth/roles';

export interface CanProps {
  permission?: Permission;
  role?: SystemRoleCode | UserRole | (SystemRoleCode | UserRole)[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Custom hook to check if the current user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const user = useStore((s) => s.user);
  if (!user || !user.role) return false;
  return hasPermission(user.role, permission);
}

/**
 * Custom hook to check if the current user belongs to any of the allowed roles
 */
export function useRole(allowedRoles: (SystemRoleCode | UserRole)[] | SystemRoleCode | UserRole): boolean {
  const user = useStore((s) => s.user);
  if (!user || !user.role) return false;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return isAuthorized(user.role, rolesArray);
}

/**
 * Custom hook providing the active tenant and super-admin state
 */
export function useTenant(): {
  organizationId: string | null;
  isSuperAdmin: boolean;
  role: SystemRoleCode;
} {
  const user = useStore((s) => s.user);
  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';

  return {
    organizationId: ((user as unknown as Record<string, unknown>)?.organizationId as string) || null,
    isSuperAdmin: canonicalRole === 'SUPER_ADMIN',
    role: canonicalRole,
  };
}

/**
 * Declarative authorization guard component for conditional UI rendering
 * 
 * Usage:
 * <Can permission="shipments:dispatch" fallback={<span>Disabled</span>}>
 *   <button onClick={handleDispatch}>Dispatch Shipment</button>
 * </Can>
 */
export function Can({ permission, role, fallback = null, children }: CanProps): React.JSX.Element | null {
  const user = useStore((s) => s.user);

  if (!user || !user.role) {
    return <>{fallback}</>;
  }

  // Permission check
  if (permission && !hasPermission(user.role, permission)) {
    return <>{fallback}</>;
  }

  // Role check
  if (role) {
    const rolesArray = Array.isArray(role) ? role : [role];
    if (!isAuthorized(user.role, rolesArray)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
