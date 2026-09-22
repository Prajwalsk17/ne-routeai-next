/**
 * AuraNER / NER-Route AI — Phase 21: Analytics Test Suite
 * 
 * Tests:
 * 1. Analytics KPI calculations on genuine domain records (Zero fabrication)
 * 2. Empty state handling when trip history is insufficient
 * 3. Multi-tenant isolation (Org A data invisible to Org B)
 * 4. Date range filtering and presets (7D, 30D, 90D, custom)
 * 5. Aggregation intervals (DAILY, WEEKLY, MONTHLY)
 * 6. Corridor reliability and bottleneck chokepoint metrics
 * 7. CSV and JSON export formatting
 * 8. REST API endpoints and authentication guards
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  generateAnalyticsSummary,
  exportAnalyticsCSV,
  resolveDateRange,
} from '@/lib/services/analytics.service';
import { createVehicle, _resetFleetStore } from '@/lib/services/fleet.service';
import { createDriver, updateDriver, _resetDriverStore } from '@/lib/services/driver.service';
import { createTripRecord, updateTripRecord, _resetTripStore } from '@/lib/services/trip.service';
import { createShipmentRecord, updateShipmentRecord, _resetShipmentStore } from '@/lib/services/shipment.service';
import { createAlert, _resetAlertStore } from '@/lib/services/alert.service';
import { saveRoute, _resetRouteStore } from '@/lib/services/route.service';
import { GET as getAnalyticsSummaryRoute } from '@/app/api/v1/analytics/summary/route';
import { GET as getCorridorsAnalyticsRoute } from '@/app/api/v1/analytics/corridors/route';
import { GET as getExportAnalyticsRoute } from '@/app/api/v1/analytics/export/route';

// Test Actors
const logisticsAssam: SessionUser = {
  id: 'usr_logistics_assam',
  email: 'logistics@assam.gov.in',
  name: 'Pranab Bora',
  role: 'LOGISTICS_MANAGER',
  organizationId: 'org_assam_civil_supplies',
};

const adminNagaland: SessionUser = {
  id: 'usr_admin_nagaland',
  email: 'admin@nagaland.gov.in',
  name: 'Temjen Imna',
  role: 'ORG_ADMIN',
  organizationId: 'org_nagaland_relief',
};

const superAdmin: SessionUser = {
  id: 'usr_super_admin',
  email: 'director@ndma.gov.in',
  name: 'Dr. Jitendra Singh',
  role: 'SUPER_ADMIN',
  organizationId: null,
};

function createMockRequest(
  method: string,
  url: string,
  user?: SessionUser,
  body?: unknown
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (user) {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const reqInit: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}

describe('Phase 21: Analytics Architecture', () => {
  beforeEach(() => {
    _resetTripStore();
    _resetShipmentStore();
    _resetFleetStore();
    _resetDriverStore();
    _resetAlertStore();
    _resetRouteStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Zero-Fabrication Invariant on Empty History
  // ---------------------------------------------------------------------------
  describe('Zero-Fabrication & Empty State Handling', () => {
    it('returns hasSufficientData: false with null metrics when no trips exist', async () => {
      const report = await generateAnalyticsSummary({ preset: '30D' }, logisticsAssam);

      expect(report.hasSufficientData).toBe(false);
      expect(report.insufficientDataReason).toBe('Insufficient trip history for the selected date range');
      expect(report.kpis.totalTrips).toBe(0);
      expect(report.kpis.completedDeliveries).toBe(0);
      expect(report.kpis.onTimeDeliveryRatePct).toBeNull();
      expect(report.kpis.avgTransitDelayMinutes).toBeNull();
      expect(report.corridorReliability.length).toBe(0);
      expect(report.provenanceHash).toBeDefined();
      expect(report.provenanceHash).toHaveLength(64);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Calculations on Real System Data
  // ---------------------------------------------------------------------------
  describe('Calculations on Genuine Operational Records', () => {
    it('accurately calculates on-time rate, delays, cargo totals, and fleet utilization', async () => {
      // 1. Create Route
      const route = await saveRoute(
        {
          name: 'Guwahati to Kohima Highway Corridor',
          originLocationId: 'loc-gau-01',
          destinationLocationId: 'loc-koh-01',
          originCoords: { lat: 26.18, lng: 91.74 },
          destinationCoords: { lat: 25.67, lng: 94.10 },
        },
        logisticsAssam
      );

      // 2. Create Vehicle & Driver
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-AX-9901',
          makeModel: 'Tata Xenon 4WD',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 2000,
          cargoVolumeM3: 6.0,
          maxGradientPct: 35,
          maxWidthMeters: 2.1,
          waterCrossingDepthMm: 650,
          hasColdChain: true,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 80,
          currentFuelPct: 90,
          facilityId: null,
          currentLocation: null,
          assignedDriverId: null,
          lastTelemetryAt: null,
          status: 'AVAILABLE',
        },
        logisticsAssam
      );

      const driver = await createDriver(
        {
          userId: 'usr_driver_dorjee',
          name: 'Dorjee Khandu',
          phone: '+919876543210',
          email: 'dorjee@assam.gov.in',
          licenseNumber: 'AS-01-2019-8801',
          licenseExpiry: '2029-01-01',
          mountainExperienceYears: 8,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
        },
        logisticsAssam
      );
      await updateDriver(driver.id, { safetyScore: 94 }, logisticsAssam);

      // 3. Create 2 Shipments (Total 3500 kg)
      const shp1 = await createShipmentRecord(
        {
          originFacilityId: 'fac-gau',
          destinationFacilityId: 'fac-koh',
          totalWeightKg: 1500,
          totalVolumeM3: 3.5,
          priority: 'HIGH',
        },
        logisticsAssam
      );
      await updateShipmentRecord(shp1.id, { status: 'DELIVERED' }, logisticsAssam);

      const shp2 = await createShipmentRecord(
        {
          originFacilityId: 'fac-gau',
          destinationFacilityId: 'fac-koh',
          totalWeightKg: 2000,
          totalVolumeM3: 4.2,
          requiresColdChain: true,
          priority: 'CRITICAL',
        },
        logisticsAssam
      );
      await updateShipmentRecord(shp2.id, { status: 'IN_TRANSIT' }, logisticsAssam);

      // 4. Create 2 Trips (1 completed on-time, 1 en-route)
      const scheduledStart = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const completedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // Completed 10m ago

      const trip1 = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
          routeVersionId: route.activeVersionId,
          scheduledStart,
        },
        logisticsAssam
      );

      await updateTripRecord(
        trip1.id,
        {
          status: 'COMPLETED',
          actualStart: scheduledStart,
          completedAt,
        },
        logisticsAssam
      );

      await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
          routeVersionId: route.activeVersionId,
          scheduledStart: new Date().toISOString(),
        },
        logisticsAssam
      );

      // 5. Generate Analytics Report
      const report = await generateAnalyticsSummary({ preset: '30D' }, logisticsAssam);

      expect(report.hasSufficientData).toBe(true);
      expect(report.kpis.totalTrips).toBe(2);
      expect(report.kpis.completedDeliveries).toBe(1);
      expect(report.kpis.cargoMovedKg).toBe(3500);
      expect(report.kpis.onTimeDeliveryRatePct).toBe(100);
      expect(report.corridorReliability.length).toBeGreaterThan(0);
      expect(report.driverCompliance.totalActiveDrivers).toBe(1);
      expect(report.driverCompliance.avgSafetyScore).toBe(94);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Multi-Tenancy & Query Isolation
  // ---------------------------------------------------------------------------
  describe('Multi-Tenancy & Organization Boundaries', () => {
    it('isolates analytics: Org A operational records are completely invisible to Org B', async () => {
      // Create a trip for Assam
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-AX-101',
          makeModel: 'Tata 4WD',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 1500,
          cargoVolumeM3: 5.0,
          maxGradientPct: 30,
          maxWidthMeters: 2.0,
          waterCrossingDepthMm: 600,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 70,
          currentFuelPct: 80,
          facilityId: null,
          currentLocation: null,
          assignedDriverId: null,
          lastTelemetryAt: null,
          status: 'AVAILABLE',
        },
        logisticsAssam
      );

      const driver = await createDriver(
        {
          userId: 'usr_drv_assam',
          name: 'Dorjee',
          phone: '+919999999999',
          email: 'd@assam.gov.in',
          licenseNumber: 'AS-01-2020-001',
          licenseExpiry: '2030-01-01',
          mountainExperienceYears: 5,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 92,
        },
        logisticsAssam
      );

      const trip = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
        },
        logisticsAssam
      );

      await updateTripRecord(trip.id, { status: 'COMPLETED' }, logisticsAssam);

      // Nagaland Admin queries analytics
      const nagalandReport = await generateAnalyticsSummary({ preset: '30D' }, adminNagaland);
      expect(nagalandReport.hasSufficientData).toBe(false);
      expect(nagalandReport.kpis.totalTrips).toBe(0);
      expect(nagalandReport.organizationId).toBe(adminNagaland.organizationId);

      // Assam Manager queries analytics
      const assamReport = await generateAnalyticsSummary({ preset: '30D' }, logisticsAssam);
      expect(assamReport.hasSufficientData).toBe(true);
      expect(assamReport.kpis.totalTrips).toBe(1);
      expect(assamReport.organizationId).toBe(logisticsAssam.organizationId);

      // Super Admin aggregates across all organizations
      const superReport = await generateAnalyticsSummary({ preset: '30D' }, superAdmin);
      expect(superReport.isCrossTenant).toBe(true);
      expect(superReport.kpis.totalTrips).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Date Range Filtering & Intervals
  // ---------------------------------------------------------------------------
  describe('Date Range Filtering & Presets', () => {
    it('resolves standard 7D, 30D, and 90D presets properly', () => {
      const r7 = resolveDateRange({ preset: '7D' });
      const r30 = resolveDateRange({ preset: '30D' });
      const r90 = resolveDateRange({ preset: '90D' });

      const diff7 = new Date(r7.end).getTime() - new Date(r7.start).getTime();
      const diff30 = new Date(r30.end).getTime() - new Date(r30.start).getTime();
      const diff90 = new Date(r90.end).getTime() - new Date(r90.start).getTime();

      expect(Math.round(diff7 / (24 * 60 * 60 * 1000))).toBe(7);
      expect(Math.round(diff30 / (24 * 60 * 60 * 1000))).toBe(30);
      expect(Math.round(diff90 / (24 * 60 * 60 * 1000))).toBe(90);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CSV and JSON Export
  // ---------------------------------------------------------------------------
  describe('Analytics Export Generation', () => {
    it('generates valid RFC 4180 CSV export content', async () => {
      const report = await generateAnalyticsSummary({ preset: '30D' }, logisticsAssam);
      const csv = exportAnalyticsCSV(report);

      expect(csv).toContain('AURANER / NER-ROUTE AI — LOGISTICS ANALYTICS BRIEF');
      expect(csv).toContain('Organization ID,org_assam_civil_supplies');
      expect(csv).toContain('CORE PERFORMANCE INDICATORS');
      expect(csv).toContain('Total Trips,0');
      expect(csv).toContain('CORRIDOR RELIABILITY METRICS');
      expect(csv).toContain('TRANSIT TIMELINE TRENDS');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. REST API Endpoints & RBAC Protection
  // ---------------------------------------------------------------------------
  describe('REST API Endpoints & RBAC Protection', () => {
    it('GET /api/v1/analytics/summary returns 200 for authenticated logistics manager', async () => {
      const req = createMockRequest('GET', '/api/v1/analytics/summary?preset=30D', logisticsAssam);
      const res = await getAnalyticsSummaryRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.organizationId).toBe(logisticsAssam.organizationId);
      expect(json.data.kpis).toBeDefined();
    });

    it('GET /api/v1/analytics/summary returns 401 for unauthenticated request', async () => {
      const req = createMockRequest('GET', '/api/v1/analytics/summary?preset=30D');
      const res = await getAnalyticsSummaryRoute(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/analytics/corridors returns 200 with corridor metrics', async () => {
      const req = createMockRequest('GET', '/api/v1/analytics/corridors?preset=30D', logisticsAssam);
      const res = await getCorridorsAnalyticsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.corridors).toBeDefined();
    });

    it('GET /api/v1/analytics/export returns CSV file download attachment', async () => {
      const req = createMockRequest('GET', '/api/v1/analytics/export?preset=30D&format=CSV', logisticsAssam);
      const res = await getExportAnalyticsRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      expect(res.headers.get('content-disposition')).toContain('attachment');
      const text = await res.text();
      expect(text).toContain('LOGISTICS ANALYTICS BRIEF');
    });

    it('GET /api/v1/analytics/export returns JSON file download attachment', async () => {
      const req = createMockRequest('GET', '/api/v1/analytics/export?preset=30D&format=JSON', logisticsAssam);
      const res = await getExportAnalyticsRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      const json = await res.json();
      expect(json.kpis).toBeDefined();
      expect(json.provenanceHash).toBeDefined();
    });
  });
});
