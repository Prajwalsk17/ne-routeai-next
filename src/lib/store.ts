import { create } from 'zustand';
import type { User, RouteAnalysisResult, EmergencyResult } from './types';

interface AppStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  sidebarCollapsed: boolean;
  copilotOpen: boolean;
  currentModule: string;
  mobileMenuOpen: boolean;

  // Active Context for Copilot and Navigation
  activeRoute: RouteAnalysisResult | null;
  sharedRoute: import('./types').SharedRouteState | null;
  activeMission: EmergencyResult | null;
  activeEmergencyCount: number;
  activeRisks: import('./types').RiskItem[];

  setUser: (user: User | null, token?: string | null) => void;
  setAuthError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleCopilot: () => void;
  setCopilotOpen: (v: boolean) => void;
  setModule: (m: string) => void;
  setActiveRoute: (route: RouteAnalysisResult | null) => void;
  setSharedRoute: (route: import('./types').SharedRouteState | null) => void;
  setActiveMission: (mission: EmergencyResult | null) => void;
  setActiveEmergencyCount: (count: number) => void;
  setActiveRisks: (risks: import('./types').RiskItem[]) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  copilotOpen: false,
  currentModule: 'dashboard',
  activeRoute: null,
  sharedRoute: null,
  activeMission: null,
  activeEmergencyCount: 1,
  activeRisks: [],

  setActiveRoute: (activeRoute) => set({ activeRoute }),
  setSharedRoute: (sharedRoute) => set({ sharedRoute }),
  setActiveMission: (activeMission) => set({ activeMission }),
  setActiveEmergencyCount: (activeEmergencyCount) => set({ activeEmergencyCount }),
  setActiveRisks: (activeRisks) => set({ activeRisks }),

  setUser: (user, token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('ner_token', token);
        document.cookie = `ner_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      }
      if (user) {
        localStorage.setItem('ner_user', JSON.stringify(user));
      }
    }
    set({
      user,
      token: token ?? null,
      isAuthenticated: Boolean(user && (token || (typeof window !== 'undefined' && localStorage.getItem('ner_token')))),
      authError: null,
    });
  },

  setAuthError: (authError) => set({ authError }),
  setIsLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
  setCopilotOpen: (v) => set({ copilotOpen: v }),
  setModule: (m) => set({ currentModule: m }),

  logout: async () => {
    try {
      if (typeof window !== 'undefined') {
        const { signOutFirebase } = await import('@/lib/auth/firebase-client');
        await signOutFirebase().catch(() => {});
        await fetch('/api/auth/signout', { method: 'POST' });
        localStorage.removeItem('ner_user');
        localStorage.removeItem('ner_token');
        document.cookie = 'ner_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie = 'ner_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
    } catch {
      // Best-effort sign-out
    } finally {
      set({ user: null, token: null, isAuthenticated: false });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const u = localStorage.getItem('ner_user');
      const t = localStorage.getItem('ner_token');
      if (t && !document.cookie.includes('ner_token=')) {
        document.cookie = `ner_token=${t}; path=/; max-age=86400; SameSite=Lax`;
      }
      if (u && t) {
        set({ user: JSON.parse(u), token: t, isAuthenticated: true });
      }
    } catch {
      // Ignore JSON parse errors on corrupted localstorage
    }
  },

  getAuthHeaders: () => {
    const token = get().token || (typeof window !== 'undefined' ? localStorage.getItem('ner_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },
}));
