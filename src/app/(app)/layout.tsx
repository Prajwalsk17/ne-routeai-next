'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import Copilot from '@/components/Copilot';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrate, user, sidebarCollapsed } = useStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('ner_token')) {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="flex min-h-screen bg-forest">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          {children}
        </main>
      </div>
      <Copilot />
    </div>
  );
}
