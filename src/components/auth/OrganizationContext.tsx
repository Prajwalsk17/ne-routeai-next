'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { normalizeRole, SystemRoleCode, hasPermission, Permission } from '@/lib/auth/roles';

export interface OrganizationInfo {
  id: string;
  name: string;
  code: string;
  state: string;
  isGlobal?: boolean;
}

export const KNOWN_ORGANIZATIONS: OrganizationInfo[] = [
  {
    id: 'org_assam_civil_supplies',
    name: 'Assam Food & Civil Supplies',
    code: 'AFCS-AS',
    state: 'Assam',
  },
  {
    id: 'org_meghalaya_disaster',
    name: 'Meghalaya Disaster Management Authority',
    code: 'MDMA-ML',
    state: 'Meghalaya',
  },
  {
    id: 'org_nagaland_relief',
    name: 'Nagaland Emergency Relief Operations',
    code: 'NERO-NL',
    state: 'Nagaland',
  },
  {
    id: 'org_tripura_health',
    name: 'Tripura Health & Essential Logistics',
    code: 'THEL-TR',
    state: 'Tripura',
  },
  {
    id: 'org_mizoram_logistics',
    name: 'Mizoram Transport & Supply Corp',
    code: 'MTSC-MZ',
    state: 'Mizoram',
  },
];

interface OrganizationContextType {
  activeOrganization: OrganizationInfo | null;
  availableOrganizations: OrganizationInfo[];
  isCrossTenant: boolean;
  canSwitchTenant: boolean;
  switchOrganization: (orgId: string | null) => void;
  userRole: SystemRoleCode;
  hasAccess: (perm: Permission) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({
  children,
  initialUser,
}: {
  children?: React.ReactNode;
  initialUser?: any;
}) {
  const { user: storeUser } = useStore();
  const user = initialUser !== undefined ? initialUser : storeUser;
  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';
  const isSuperAdmin = canonicalRole === 'SUPER_ADMIN';

  // Read user's assigned organization
  const userOrgId = ((user as unknown as Record<string, unknown>)?.organizationId as string) || null;

  // Selected organization for SUPER_ADMIN tenant switching (null = Cross-Tenant Global View)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ner_active_org_id') || null;
    }
    return null;
  });

  // Determine active organization
  const activeOrganization = useMemo(() => {
    if (isSuperAdmin) {
      if (!selectedOrgId) return null; // Global mode
      return KNOWN_ORGANIZATIONS.find((o) => o.id === selectedOrgId) || {
        id: selectedOrgId,
        name: selectedOrgId,
        code: selectedOrgId.slice(0, 8).toUpperCase(),
        state: 'NE Region',
      };
    }

    if (!userOrgId) return null;
    return (
      KNOWN_ORGANIZATIONS.find((o) => o.id === userOrgId) || {
        id: userOrgId,
        name: userOrgId.replace(/_/g, ' ').toUpperCase(),
        code: userOrgId.slice(0, 8).toUpperCase(),
        state: 'Assigned State',
      }
    );
  }, [isSuperAdmin, selectedOrgId, userOrgId]);

  const switchOrganization = (orgId: string | null) => {
    if (!isSuperAdmin) return; // Non-super-admins cannot switch tenants
    setSelectedOrgId(orgId);
    if (typeof window !== 'undefined') {
      if (orgId) {
        localStorage.setItem('ner_active_org_id', orgId);
      } else {
        localStorage.removeItem('ner_active_org_id');
      }
    }
  };

  const hasAccess = (perm: Permission): boolean => {
    return hasPermission(canonicalRole, perm);
  };

  const value = {
    activeOrganization,
    availableOrganizations: KNOWN_ORGANIZATIONS,
    isCrossTenant: isSuperAdmin && selectedOrgId === null,
    canSwitchTenant: isSuperAdmin,
    switchOrganization,
    userRole: canonicalRole,
    hasAccess,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return ctx;
}

export function useCurrentUser() {
  const { user } = useStore();
  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';

  return {
    user,
    role: canonicalRole,
    isSuperAdmin: canonicalRole === 'SUPER_ADMIN',
    isOrgAdmin: canonicalRole === 'ORG_ADMIN',
    isDispatcher: canonicalRole === 'DISPATCHER',
    can: (permission: Permission) => hasPermission(canonicalRole, permission),
  };
}
