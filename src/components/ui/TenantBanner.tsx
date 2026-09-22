'use client';

import React from 'react';
import { useOrganization } from '@/components/auth/OrganizationContext';
import { ShieldAlert, Building2, Globe } from 'lucide-react';

export default function TenantBanner() {
  const { isCrossTenant, activeOrganization, canSwitchTenant } = useOrganization();

  if (!canSwitchTenant && !activeOrganization) {
    return null;
  }

  return (
    <div
      className={`w-full py-2 px-6 flex items-center justify-between border-b text-xs transition-colors ${
        isCrossTenant
          ? 'bg-safe/10 border-safe/25 text-safe-light'
          : 'bg-forest-100/50 border-white/[0.06] text-mist-dim'
      }`}
      data-testid="tenant-banner"
    >
      <div className="flex items-center gap-2">
        {isCrossTenant ? (
          <>
            <Globe size={15} className="text-safe flex-shrink-0 animate-pulse" />
            <span>
              <strong className="text-white">Cross-Tenant Mode Active</strong>: Aggregating logistics telemetry across all 8 North Eastern States.
            </span>
          </>
        ) : (
          <>
            <Building2 size={15} className="text-teal-light flex-shrink-0" />
            <span>
              <strong className="text-white">{activeOrganization?.name}</strong> • Tenant Isolation Active ({activeOrganization?.state})
            </span>
          </>
        )}
      </div>

    </div>
  );
}
