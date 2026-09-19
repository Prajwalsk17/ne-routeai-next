import { create } from 'zustand';
import type { User } from './types';

interface AppStore {
  user: User | null;
  token: string | null;
  sidebarCollapsed: boolean;
  copilotOpen: boolean;
  currentModule: string;

  setUser: (user: User | null, token?: string | null) => void;
  toggleSidebar: () => void;
  toggleCopilot: () => void;
  setCopilotOpen: (v: boolean) => void;
  setModule: (m: string) => void;
  logout: () => void;
  hydrate: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  token: null,
  sidebarCollapsed: false,
  copilotOpen: false,
  currentModule: 'dashboard',

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
    set({ user, token: token ?? null });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
  setCopilotOpen: (v) => set({ copilotOpen: v }),
  setModule: (m) => set({ currentModule: m }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ner_user');
      localStorage.removeItem('ner_token');
      document.cookie = 'ner_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    set({ user: null, token: null });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const u = localStorage.getItem('ner_user');
      const t = localStorage.getItem('ner_token');
      if (t && !document.cookie.includes('ner_token=')) {
        document.cookie = `ner_token=${t}; path=/; max-age=86400; SameSite=Lax`;
      }
      if (u && t) set({ user: JSON.parse(u), token: t });
    } catch { /* ignore */ }
  },
  getAuthHeaders: () => {
    const token = get().token || (typeof window !== 'undefined' ? localStorage.getItem('ner_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },
}));
