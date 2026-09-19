'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Mountain, LayoutDashboard, Route, ShieldAlert, MapPin, Siren, Truck, Warehouse, TrendingUp, FlaskConical, Brain, BarChart3, Settings, LogOut, AlertTriangle, Navigation } from 'lucide-react';

const NAV = [
  { path: '/dispatch', label: 'Dispatch Center', icon: Navigation, badge: 'LIVE', badgeColor: 'bg-teal/20 text-teal-light' },
  { path: '/driver', label: 'Driver View', icon: Truck, badge: 'GPS', badgeColor: 'bg-safe/20 text-safe-light' },
  { path: '/dashboard', label: 'Command Center', icon: LayoutDashboard, badge: '' },
  { path: '/routes', label: 'Smart Route AI', icon: Route, badge: 'AI', badgeColor: 'bg-orchid/20 text-orchid-light' },
  { path: '/risk', label: 'Risk Intelligence', icon: ShieldAlert, badge: '3', badgeColor: 'bg-danger/20 text-danger-light' },
  { path: '/accessibility', label: 'Accessibility', icon: MapPin, badge: '' },
  { path: '/emergency', label: 'Emergency', icon: Siren, badge: '!', badgeColor: 'bg-amber/20 text-amber-light' },
  { path: '/fleet', label: 'Fleet Management', icon: Truck, badge: '' },
  { path: '/warehouses', label: 'Warehouses', icon: Warehouse, badge: '' },
  { path: '/demand', label: 'Demand Forecast', icon: TrendingUp, badge: '' },
  { path: '/simulator', label: 'Disaster Simulator', icon: FlaskConical, badge: '' },
  { path: '/copilot', label: 'AI Copilot', icon: Brain, badge: 'AI', badgeColor: 'bg-orchid/20 text-orchid-light' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, badge: '' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, user, logout } = useStore();
  const initials = user?.name.split(' ').map(w => w[0]).join('').toUpperCase() || 'DU';

  return (
    <aside className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-forest-200 border-r border-white/[0.06] transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
        <Mountain className="w-8 h-8 text-orchid flex-shrink-0" />
        {!sidebarCollapsed && (
          <div>
            <span className="text-base font-extrabold text-white">NER-Route<span className="text-safe">AI</span></span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        {NAV.map(n => {
          const active = pathname === n.path;
          return (
            <Link key={n.path} href={n.path}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${active ? 'bg-orchid/[0.12] text-orchid font-semibold' : 'text-mist-dim hover:bg-orchid/[0.06] hover:text-mist'}`}>
              <n.icon size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1">{n.label}</span>
                  {n.badge && <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-bold ${n.badgeColor || 'bg-orchid/20 text-orchid-light'}`}>{n.badge}</span>}
                </>
              )}
            </Link>
          );
        })}
        <Link href="/settings"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-mist-dim hover:bg-orchid/[0.06] transition-all ${pathname === '/settings' ? 'bg-orchid/[0.12] text-orchid' : ''}`}>
          <Settings size={20} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-sm text-white font-semibold">{user?.name || 'Demo User'}</p>
              <p className="text-[0.65rem] text-mist-muted">{user?.role === 'officer' ? 'Government Officer' : 'Logistics Operator'}</p>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <button onClick={logout} className="text-mist-muted hover:text-danger transition-colors p-2">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
