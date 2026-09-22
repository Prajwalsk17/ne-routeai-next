'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { normalizeRole } from '@/lib/auth/roles';
import { authFetch } from '@/lib/api';
import OrganizationSwitcher from '@/components/layout/OrganizationSwitcher';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import {
  Menu,
  Search,
  MapPin,
  Bell,
  Brain,
  LogOut,
  X,
  Check,
  CheckCheck,
  Loader2,
  Package,
  Truck,
  Users,
  Building,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'LOCATION' | 'SHIPMENT' | 'VEHICLE' | 'DRIVER' | 'WAREHOUSE';
  href: string;
  badge?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
}

export default function TopBar() {
  const router = useRouter();
  const { toggleSidebar, toggleMobileMenu, toggleCopilot, user, logout } = useStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationContainerRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'DU';
  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';
  const roleDisplay = canonicalRole.replace(/_/g, ' ');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const res = await authFetch('/api/v1/notifications?limit=15');
      if (res.ok) {
        const json = await res.json();
        const items = json.data || [];
        setNotifications(items);
        const unread = items.filter((n: NotificationItem) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch {
      // Non-blocking notification fetch
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Poll notifications on mount & every 45s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await authFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // Non-blocking
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      const res = await authFetch('/api/v1/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Non-blocking
    }
  };

  // Debounced global search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/v1/search?q=${encodeURIComponent(q)}&global=true`);
        if (!res.ok) {
          throw new Error('Search query failed');
        }
        const json = await res.json();
        const items: SearchResultItem[] = json.data?.items || [];
        setSearchResults(items);
        setSearchDropdownOpen(true);
      } catch (err: unknown) {
        setSearchError(err instanceof Error ? err.message : 'Search error');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard navigation & click outside listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchDropdownOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchResultClick = (item: SearchResultItem) => {
    setSearchDropdownOpen(false);
    setSearchQuery('');
    router.push(item.href);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleSearchResultClick(searchResults[0]);
    }
  };

  const renderCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'SHIPMENT':
        return <Package size={14} className="text-orchid" />;
      case 'VEHICLE':
        return <Truck size={14} className="text-teal" />;
      case 'DRIVER':
        return <Users size={14} className="text-amber" />;
      case 'WAREHOUSE':
        return <Building size={14} className="text-safe" />;
      case 'LOCATION':
      default:
        return <MapPin size={14} className="text-mist-muted" />;
    }
  };

  return (
    <header className="h-[60px] sticky top-0 z-30 glass-heavy flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06]">
      {/* Left section: Hamburger toggles & Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={toggleMobileMenu}
          className="text-mist-dim hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.06] lg:hidden"
          title="Open Navigation"
          aria-label="Open Navigation"
        >
          <Menu size={20} />
        </button>

        {/* Desktop sidebar collapse trigger */}
        <button
          onClick={toggleSidebar}
          className="text-mist-dim hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.06] hidden lg:block"
          title="Toggle Navigation Width"
          aria-label="Toggle Navigation Width"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb path navigation */}
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right section: Search, Organization Context, Status, Copilot, Notifications, Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Organization Scope Switcher / Indicator */}
        <OrganizationSwitcher />

        {/* Functional Search Bar */}
        <div ref={searchContainerRef} className="relative hidden xl:block">
          <div className="flex items-center gap-2 bg-forest-200/60 border border-white/[0.08] rounded-lg px-3 py-1.5 min-w-[240px] focus-within:border-orchid/50 transition-colors">
            {isSearching ? (
              <Loader2 size={14} className="text-orchid animate-spin" />
            ) : (
              <Search size={14} className="text-mist-muted" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setSearchDropdownOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search locations, routes, shipments..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-mist-muted w-full"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchDropdownOpen(false);
                }}
                className="text-mist-muted hover:text-white p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchDropdownOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full mt-1.5 left-0 w-[340px] bg-forest-300/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 max-h-[380px] overflow-y-auto">
              {isSearching && (
                <div className="py-4 text-center text-xs text-mist-dim flex items-center justify-center gap-2">
                  <Loader2 size={13} className="animate-spin text-orchid" />
                  <span>Searching authorized entities...</span>
                </div>
              )}

              {!isSearching && searchError && (
                <div className="p-3 text-xs text-danger-light bg-danger/10 border border-danger/20 rounded-lg">
                  {searchError}
                </div>
              )}

              {!isSearching && !searchError && searchResults.length === 0 && (
                <div className="py-4 text-center text-xs text-mist-muted">
                  No matches found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mist-muted">
                    Found {searchResults.length} authorized results
                  </div>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/[0.06] transition-colors flex items-start gap-2.5 group"
                    >
                      <div className="p-1.5 rounded bg-white/[0.04] mt-0.5 flex-shrink-0">
                        {renderCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-white truncate group-hover:text-orchid-light transition-colors">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-mist-muted">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-mist-dim truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Operational Region Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orchid/10 border border-orchid/20 text-orchid-light text-xs font-semibold">
          <MapPin size={13} />
          <span>NE Region</span>
        </div>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={toggleCopilot}
          className="text-mist-dim hover:text-orchid transition-colors p-2 rounded-lg hover:bg-orchid/10"
          title="AI Assistant Copilot"
          aria-label="AI Assistant Copilot"
        >
          <Brain size={19} />
        </button>

        {/* Alert Notifications Trigger with Unread Counter */}
        <div ref={notificationContainerRef} className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) fetchNotifications();
            }}
            className="text-mist-dim hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.06] relative"
            title="System Notifications"
            aria-label="System Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-danger text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-forest-300 shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {notificationsOpen && (
            <div className="absolute top-full mt-2 right-0 w-[340px] sm:w-[380px] max-w-[90vw] bg-forest-300/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Notifications</span>
                  {unreadCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger/20 text-danger-light">
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-mist-muted">
                      0 unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-orchid hover:text-orchid-light font-semibold flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
                {notificationsLoading && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-mist-dim flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-orchid" />
                    <span>Loading alerts...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-mist-muted space-y-1">
                    <Bell size={22} className="mx-auto text-mist-muted/40 mb-2" />
                    <p className="font-medium text-slate-300">No Notifications</p>
                    <p className="text-[11px] text-mist-dim">System alerts and dispatches will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 transition-colors ${
                        n.isRead ? 'bg-transparent opacity-75' : 'bg-white/[0.02]'
                      } hover:bg-white/[0.04] flex items-start gap-2.5`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {n.priority === 'CRITICAL' ? (
                          <AlertTriangle size={15} className="text-danger" />
                        ) : n.priority === 'HIGH' ? (
                          <AlertTriangle size={15} className="text-amber" />
                        ) : (
                          <Info size={15} className="text-teal" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-mist-muted whitespace-nowrap font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-mist-dim line-clamp-2 mt-0.5 leading-relaxed">
                          {n.body}
                        </p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="text-mist-muted hover:text-safe p-1 rounded hover:bg-white/[0.06] transition-colors flex-shrink-0 mt-0.5"
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs text-white font-medium block leading-none truncate max-w-[110px]">
              {user?.name || 'Authorized User'}
            </span>
            <span className="text-[0.65rem] text-mist-muted font-semibold tracking-wider block mt-1 uppercase">
              {roleDisplay}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="text-mist-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-colors ml-0.5"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
