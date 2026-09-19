'use client';
import { useStore } from '@/lib/store';
import { Menu, Search, MapPin, Bell, Brain } from 'lucide-react';

export default function TopBar() {
  const { toggleSidebar, toggleCopilot, user, sidebarCollapsed } = useStore();
  const initials = user?.name.split(' ').map(w => w[0]).join('').toUpperCase() || 'DU';

  return (
    <header className="h-[60px] sticky top-0 z-30 glass-heavy flex items-center justify-between px-6 border-b border-white/[0.06]">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-mist-dim hover:text-white transition-colors p-2">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 bg-forest-200/60 border border-white/[0.08] rounded-lg px-4 py-2 min-w-[280px]">
          <Search size={16} className="text-mist-muted" />
          <input type="text" placeholder="Search locations, routes, vehicles..." className="bg-transparent border-none outline-none text-sm text-white placeholder-mist-muted w-full" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orchid/10 border border-orchid/20 text-orchid-light text-xs font-semibold">
          <MapPin size={14} /> NE Region
        </div>
        <button onClick={toggleCopilot} className="text-mist-dim hover:text-orchid transition-colors p-2" title="AI Copilot">
          <Brain size={20} />
        </button>
        <button className="text-mist-dim hover:text-white transition-colors p-2 relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger rounded-full text-[0.55rem] text-white flex items-center justify-center font-bold">8</span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          <span className="text-sm text-mist hidden sm:block">{user?.name || 'Demo User'}</span>
        </div>
      </div>
    </header>
  );
}
