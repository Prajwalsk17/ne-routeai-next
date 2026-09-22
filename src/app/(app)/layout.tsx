'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { subscribeToAuthState, getCurrentFirebaseUser } from '@/lib/auth/firebase-client';
import { OrganizationProvider } from '@/components/auth/OrganizationContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TenantBanner from '@/components/ui/TenantBanner';
import Copilot from '@/components/Copilot';
import { Mountain } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrate, sidebarCollapsed } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const pathnameRef = React.useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    hydrate();

    const hasLocalToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('ner_token'));

    // Subscribe to real Firebase authentication state once on layout mount
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ner_token') : null;
      if (firebaseUser) {
        setIsAuthorized(true);
        setIsAuthChecking(false);
      } else if (token) {
        // Fallback session state while Firebase completes initial verification
        setIsAuthorized(true);
        setIsAuthChecking(false);
      } else {
        setIsAuthorized(false);
        setIsAuthChecking(false);
        const target = pathnameRef.current || '/dispatch';
        router.replace(`/login?from=${encodeURIComponent(target)}`);
      }
    });

    if (hasLocalToken) {
      setIsAuthorized(true);
      setIsAuthChecking(false);
    } else {
      // If neither local token nor active Firebase user exists, redirect to login
      const timer = setTimeout(() => {
        const latestToken = typeof window !== 'undefined' ? localStorage.getItem('ner_token') : null;
        const currentFbUser = getCurrentFirebaseUser();
        if (!latestToken && !currentFbUser) {
          setIsAuthorized(false);
          setIsAuthChecking(false);
          const target = pathnameRef.current || '/dispatch';
          router.replace(`/login?from=${encodeURIComponent(target)}`);
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    return () => unsubscribe();
  }, [hydrate, router]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#080C0A] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 rounded-2xl bg-teal/15 border border-teal/30 flex items-center justify-center text-teal animate-pulse mb-4">
          <Mountain className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2.5 text-xs text-mist-dim font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
          Verifying enterprise security session...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <OrganizationProvider>
      <div className="flex min-h-screen bg-forest text-mist selection:bg-orchid selection:text-white">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Application Shell Content */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
          } ml-0`}
        >
          {/* Header */}
          <TopBar />

          {/* Tenant Isolation / Cross-Tenant Mode Notice */}
          <TenantBanner />

          {/* Viewport Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-100px)]">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="max-w-7xl mx-auto space-y-6"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* AI Copilot Drawer */}
        <Copilot />
      </div>
    </OrganizationProvider>
  );
}
