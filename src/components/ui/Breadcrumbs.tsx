'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Command Center',
  dispatch: 'Dispatch Center',
  new: 'New Dispatch',
  driver: 'Driver Telemetry',
  routes: 'Smart Route AI',
  risk: 'Risk Intelligence',
  accessibility: 'Accessibility Radar',
  emergency: 'Emergency Missions',
  fleet: 'Fleet Management',
  warehouses: 'Warehouses',
  demand: 'Demand Forecast',
  simulator: 'Disaster Simulator',
  copilot: 'AI Copilot',
  analytics: 'Analytics',
  settings: 'Settings',
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ customItems, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();

  let items: BreadcrumbItem[] = [];

  if (customItems && customItems.length > 0) {
    items = customItems;
  } else {
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    items = segments.map((seg, idx) => {
      currentPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const label = ROUTE_LABELS[seg.toLowerCase()] || seg.charAt(0).toUpperCase() + seg.slice(1);

      return {
        label,
        href: isLast ? undefined : currentPath,
      };
    });
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-mist-muted ${className}`}>
      <ol className="flex items-center space-x-1.5 list-none m-0 p-0">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-mist-dim hover:text-white transition-colors"
            title="Home"
          >
            <Home size={13} className="mr-1 text-orchid" />
            <span className="hidden sm:inline">Portal</span>
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center space-x-1.5">
              <ChevronRight size={12} className="text-mist-muted flex-shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-mist-dim hover:text-mist transition-colors capitalize"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="text-mist font-semibold capitalize"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
