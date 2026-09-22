'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { normalizeRole, hasPermission, Permission, SystemRoleCode } from '@/lib/auth/roles';
import {
  Mountain,
  LayoutDashboard,
  Route,
  ShieldAlert,
  MapPin,
  Siren,
  Truck,
  Warehouse,
  TrendingUp,
  FlaskConical,
  Brain,
  BarChart3,
  Settings,
  LogOut,
  Navigation,
  Package,
  Users,
  X,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeColor?: string;
  requiredPermission?: Permission;
  requiredRoles?: SystemRoleCode[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Command Center',
    icon: LayoutDashboard,
  },
  {
    path: '/dispatch',
    label: 'Dispatch Center',
    icon: Navigation,
    badge: 'LIVE',
    badgeColor: 'bg-teal/20 text-teal-light',
    requiredPermission: 'shipments:dispatch',
  },
  {
    path: '/shipments',
    label: 'Shipments & Cargo',
    icon: Package,
    requiredPermission: 'shipments:read',
  },
  {
    path: '/driver',
    label: 'Driver View',
    icon: Truck,
    badge: 'GPS',
    badgeColor: 'bg-safe/20 text-safe-light',
    requiredRoles: ['DRIVER', 'SUPER_ADMIN', 'ORG_ADMIN', 'DISPATCHER'],
  },
  {
    path: '/routes',
    label: 'Smart Route AI',
    icon: Route,
    badge: 'AI',
    badgeColor: 'bg-orchid/20 text-orchid-light',
    requiredPermission: 'routes:view_all',
  },
  {
    path: '/risk',
    label: 'Risk Intelligence',
    icon: ShieldAlert,
    requiredPermission: 'alerts:view',
  },
  {
    path: '/accessibility',
    label: 'Accessibility Radar',
    icon: MapPin,
  },
  {
    path: '/emergency',
    label: 'Emergency Mission',
    icon: Siren,
  },
  {
    path: '/fleet',
    label: 'Fleet Management',
    icon: Truck,
    requiredPermission: 'fleet:read',
  },
  {
    path: '/drivers',
    label: 'Driver Roster',
    icon: Users,
    requiredPermission: 'drivers:read',
  },
  {
    path: '/warehouses',
    label: 'Warehouses',
    icon: Warehouse,
    requiredPermission: 'fleet:read',
  },
  {
    path: '/demand',
    label: 'Demand Forecast',
    icon: TrendingUp,
    requiredPermission: 'shipments:read',
  },
  {
    path: '/simulator',
    label: 'Disaster Simulator',
    icon: FlaskConical,
    requiredRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DISPATCHER'],
  },
  {
    path: '/copilot',
    label: 'AI Copilot',
    icon: Brain,
    badge: 'AI',
    badgeColor: 'bg-orchid/20 text-orchid-light',
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    requiredRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'LOGISTICS_MANAGER'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    closeMobileMenu,
    user,
    logout,
    activeEmergencyCount,
    setActiveEmergencyCount,
  } = useStore();

  React.useEffect(() => {
    fetch('/api/v1/emergency/missions?count_only=true')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.count !== undefined) {
          setActiveEmergencyCount(json.data.count);
        }
      })
      .catch(() => {});
  }, [setActiveEmergencyCount]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'DU';
  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';
  const roleDisplay = canonicalRole.replace(/_/g, ' ');

  // Filter navigation links based on user permissions and roles
  const authorizedNav = NAV_ITEMS.filter((item) => {
    if (canonicalRole === 'SUPER_ADMIN') return true;
    if (item.requiredRoles && !item.requiredRoles.includes(canonicalRole)) {
      return false;
    }
    if (item.requiredPermission && !hasPermission(canonicalRole, item.requiredPermission)) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-forest-200 border-r border-white/[0.06] transition-all duration-300 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="app-sidebar"
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
          <Link
            href="/dashboard"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 overflow-hidden"
          >
            <Mountain className="w-8 h-8 text-orchid flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-base font-extrabold text-white tracking-tight">
                NER-Route<span className="text-safe">AI</span>
              </span>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={closeMobileMenu}
            className="p-1.5 text-mist-muted hover:text-white rounded-lg hover:bg-white/[0.06] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
          {authorizedNav.map((n) => {
            const active = pathname === n.path || (n.path !== '/dashboard' && pathname.startsWith(n.path));
            return (
              <Link
                key={n.path}
                href={n.path}
                prefetch={false}
                onClick={closeMobileMenu}
                title={sidebarCollapsed ? n.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-orchid/[0.12] text-orchid font-semibold border-l-2 border-orchid'
                    : 'text-mist-dim hover:bg-white/[0.04] hover:text-mist'
                }`}
              >
                <n.icon size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 truncate">{n.label}</span>
                    {n.path === '/emergency' ? (
                      activeEmergencyCount > 0 && (
                        <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-bold bg-danger/25 text-danger animate-pulse">
                          {activeEmergencyCount}
                        </span>
                      )
                    ) : n.badge ? (
                      <span
                        className={`text-[0.6rem] px-2 py-0.5 rounded-full font-bold ${
                          n.badgeColor || 'bg-orchid/20 text-orchid-light'
                        }`}
                      >
                        {n.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            );
          })}

          <Link
            href="/settings"
            prefetch={false}
            onClick={closeMobileMenu}
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              pathname === '/settings'
                ? 'bg-orchid/[0.12] text-orchid font-semibold border-l-2 border-orchid'
                : 'text-mist-dim hover:bg-white/[0.04] hover:text-mist'
            }`}
          >
            <Settings size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="px-3 py-4 border-t border-white/[0.06] flex items-center justify-between bg-forest-300/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">
                  {user?.name || 'Authorized User'}
                </p>
                <p className="text-[0.65rem] text-mist-muted font-semibold tracking-wider uppercase truncate">
                  {roleDisplay}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => logout()}
              className="text-mist-muted hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
