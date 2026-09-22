/**
 * AuraNER / NER-Route AI — Phase 24: Frontend Components Test Suite
 * 
 * Verifies SSR/UI state rendering:
 * 1. EmptyState (zero records, action buttons, compact vs standard)
 * 2. ErrorState (interruption display, correlation ID ref, retry trigger)
 * 3. LoadingSkeleton (SkeletonTable, SkeletonCard, SkeletonKPI shimmer placeholders)
 * 4. TenantBanner (organization identity, operational state, jurisdiction with OrganizationProvider)
 * 5. KPICard (metric formatting, units, trend badges)
 * 6. Badge & ProgressBar (severity levels, color tokens, percentage fills)
 * 7. DataTable (headers, empty fallback, row items)
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

// Ensure React is globally available for JSX runtime in Node environment
(globalThis as any).React = React;

import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import {
  Skeleton,
  SkeletonTable,
  SkeletonCard,
  SkeletonKPI,
} from '@/components/ui/LoadingSkeleton';
import TenantBanner from '@/components/ui/TenantBanner';
import { OrganizationProvider } from '@/components/auth/OrganizationContext';
import { useStore } from '@/lib/store';
import KPICard from '@/components/ui/KPICard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import DataTable from '@/components/ui/DataTable';
import { Truck } from 'lucide-react';

describe('Phase 24: Frontend Components & UI States', () => {
  describe('1. EmptyState Component', () => {
    it('renders empty state with title, description, and primary action button', () => {
      const html = renderToString(
        React.createElement(EmptyState, {
          icon: Truck,
          title: 'No Active Dispatches',
          description: 'There are currently no active dispatches in this corridor.',
          primaryAction: {
            label: 'Create New Dispatch',
            href: '/dispatch/new',
          },
        })
      );

      expect(html).toContain('No Active Dispatches');
      expect(html).toContain('There are currently no active dispatches');
      expect(html).toContain('Create New Dispatch');
      expect(html).toContain('href="/dispatch/new"');
      expect(html).toContain('data-testid="empty-state"');
    });

    it('renders compact empty state with secondary action', () => {
      const html = renderToString(
        React.createElement(EmptyState, {
          compact: true,
          title: 'Zero Incidents',
          description: 'All clear on this route.',
          secondaryAction: {
            label: 'Refresh Status',
            href: '/risk',
          },
        })
      );

      expect(html).toContain('Zero Incidents');
      expect(html).toContain('All clear on this route.');
      expect(html).toContain('Refresh Status');
    });
  });

  describe('2. ErrorState Component', () => {
    it('renders error state with title, message, and correlation ID', () => {
      const correlationId = 'corr-9921-test-uuid';
      const html = renderToString(
        React.createElement(ErrorState, {
          title: 'Telemetry Connection Severed',
          message: 'Failed to contact the BRO road station API.',
          correlationId,
        })
      );

      expect(html).toContain('Telemetry Connection Severed');
      expect(html).toContain('Failed to contact the BRO road station API.');
      expect(html).toContain(correlationId);
      expect(html).toContain('ref:');
      expect(html).toContain('data-testid="error-state"');
    });
  });

  describe('3. LoadingSkeleton Variants', () => {
    it('renders SkeletonTable with specified rows and columns', () => {
      const html = renderToString(React.createElement(SkeletonTable, { rows: 4, cols: 5 }));
      expect(html).toContain('data-testid="skeleton-table"');
      expect(html).toContain('grid');
    });

    it('renders SkeletonCard and SkeletonKPI', () => {
      const cardHtml = renderToString(React.createElement(SkeletonCard, { rows: 3 }));
      expect(cardHtml).toContain('data-testid="skeleton-card"');

      const kpiHtml = renderToString(React.createElement(SkeletonKPI));
      expect(kpiHtml).toContain('data-testid="skeleton-kpi"');
    });

    it('renders basic Skeleton placeholder with custom classes', () => {
      const skeletonHtml = renderToString(React.createElement(Skeleton, { className: 'h-6 w-48' }));
      expect(skeletonHtml).toContain('data-testid="skeleton"');
      expect(skeletonHtml).toContain('animate-pulse');
    });
  });

  describe('4. TenantBanner Component', () => {
    it('renders tenant banner inside OrganizationProvider context', () => {
      const html = renderToString(
        React.createElement(
          OrganizationProvider,
          {
            initialUser: {
              name: 'Pranab Bora',
              email: 'pranab@assam.gov.in',
              role: 'DISPATCHER',
              organizationId: 'org_assam_civil_supplies',
            },
          },
          React.createElement(TenantBanner)
        )
      );

      expect(html).toContain('data-testid="tenant-banner"');
      expect(html).toContain('Tenant Isolation Active');
      expect(html).not.toContain('TENANT_ID:');
    });
  });

  describe('5. KPICard Component', () => {
    it('renders numeric value, suffix, and title accurately', () => {
      const html = renderToString(
        React.createElement(KPICard, {
          title: 'Active Fleet Vehicles',
          value: 42,
          suffix: 'units',
          icon: Truck,
          color: 'teal',
          animate: false,
          trend: { value: 12, label: 'vs yesterday' },
        })
      );

      expect(html).toContain('Active Fleet Vehicles');
      expect(html).toContain('42');
      expect(html).toContain('units');
      expect(html).toContain('vs yesterday');
    });
  });

  describe('6. Badge & ProgressBar Components', () => {
    it('renders severity badges with proper color tokens', () => {
      const criticalHtml = renderToString(React.createElement(Badge, { variant: 'CRITICAL' }, 'CRITICAL'));
      expect(criticalHtml).toContain('CRITICAL');
      expect(criticalHtml).toContain('text-danger-light');

      const safeHtml = renderToString(React.createElement(Badge, { variant: 'LOW' }, 'CLEAR'));
      expect(safeHtml).toContain('CLEAR');
      expect(safeHtml).toContain('text-safe-light');
    });

    it('renders progress bar with clamped percentage fill and label', () => {
      const html = renderToString(
        React.createElement(ProgressBar, {
          value: 75,
          max: 100,
          color: 'amber',
          showLabel: true,
        })
      );

      expect(html).toContain('75%');
      expect(html).toContain('style="width:75%"');
    });
  });

  describe('7. DataTable Component', () => {
    it('renders tabular headers and data rows correctly', () => {
      const columns = [
        { key: 'vehicleId', label: 'Vehicle ID' },
        { key: 'driverName', label: 'Driver' },
        { key: 'status', label: 'Status' },
      ];

      const data = [
        { vehicleId: 'AS-01-AX-1010', driverName: 'Dorjee Thongdok', status: 'IN_TRANSIT' },
        { vehicleId: 'AS-01-BX-2020', driverName: 'Temjen Imna', status: 'AVAILABLE' },
      ];

      const html = renderToString(
        React.createElement(DataTable, {
          columns,
          data,
        })
      );

      expect(html).toContain('Vehicle ID');
      expect(html).toContain('Driver');
      expect(html).toContain('Dorjee Thongdok');
      expect(html).toContain('AS-01-AX-1010');
      expect(html).toContain('Temjen Imna');
    });

    it('renders fallback when data is empty', () => {
      const columns = [{ key: 'id', label: 'ID' }];
      const html = renderToString(
        React.createElement(DataTable, {
          columns,
          data: [],
          emptyMessage: 'No logistics records available',
        })
      );

      expect(html).toContain('No logistics records available');
    });
  });
});
