'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '@/components/auth/OrganizationContext';
import { Building2, ShieldAlert, ChevronDown, Check, Globe } from 'lucide-react';

export default function OrganizationSwitcher() {
  const {
    activeOrganization,
    availableOrganizations,
    isCrossTenant,
    canSwitchTenant,
    switchOrganization,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // For regular tenant users: locked organization indicator
  if (!canSwitchTenant) {
    if (!activeOrganization) return null;
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-forest-100/60 border border-white/[0.08] text-xs"
        title={`Assigned Organization: ${activeOrganization.name}`}
      >
        <Building2 size={14} className="text-teal-light" />
        <span className="font-semibold text-mist truncate max-w-[140px] md:max-w-[200px]">
          {activeOrganization.name}
        </span>
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-teal/15 text-teal-light font-bold">
          {activeOrganization.state}
        </span>
      </div>
    );
  }

  // For SUPER_ADMIN: Interactive switcher dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-forest-100/80 border border-white/[0.12] hover:border-orchid/40 text-xs transition-all duration-200"
        title="Switch Organization Scope (Super Admin)"
      >
        {isCrossTenant ? (
          <>
            <Globe size={14} className="text-safe" />
            <span className="font-bold text-safe-light tracking-wide text-[0.7rem]">
              GLOBAL (CROSS-TENANT)
            </span>
          </>
        ) : (
          <>
            <Building2 size={14} className="text-orchid-light" />
            <span className="font-semibold text-mist truncate max-w-[130px] md:max-w-[190px]">
              {activeOrganization?.name}
            </span>
            <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-orchid/15 text-orchid-light font-bold">
              {activeOrganization?.state}
            </span>
          </>
        )}
        <ChevronDown size={13} className="text-mist-muted ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-glass glass-heavy border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
            <span className="text-[0.65rem] font-bold text-mist-muted tracking-wider uppercase">
              Tenant Scope Switcher
            </span>
          </div>

          {/* Global Cross-Tenant Option */}
          <button
            onClick={() => {
              switchOrganization(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-white/[0.06] transition-colors ${
              isCrossTenant ? 'text-safe font-bold bg-safe/10' : 'text-mist'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-safe" />
              <div>
                <p className="leading-none">Global Cross-Tenant View</p>
                <span className="text-[0.65rem] text-mist-muted">All 8 NE States & Hubs</span>
              </div>
            </div>
            {isCrossTenant && <Check size={14} className="text-safe" />}
          </button>

          <div className="my-1.5 border-t border-white/[0.06]" />

          {/* Regional Organization Options */}
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {availableOrganizations.map((org) => {
              const isSelected = activeOrganization?.id === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-white/[0.06] transition-colors ${
                    isSelected ? 'text-orchid font-bold bg-orchid/10' : 'text-mist'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className={isSelected ? 'text-orchid' : 'text-mist-dim'} />
                    <div>
                      <p className="leading-tight truncate max-w-[180px]">{org.name}</p>
                      <span className="text-[0.65rem] text-mist-muted">{org.state}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-orchid" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
