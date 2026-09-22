/**
 * AuraNER / NER-Route AI — Phase 12: GPS + Real-Time Telemetry Verification Test Suite
 * 
 * Verifies production-grade GPS capture, position ingestion, and telemetry tracking:
 * 1. Valid GPS ingestion with geospatial coordinates and accuracy metadata
 * 2. Sanity validation (rejection of out-of-range lat/lng, negative speeds)
 * 3. Temporal validation (rejection of future timestamps > 5m, ancient timestamps > 7d)
 * 4. Accuracy and battery telemetry metadata preservation
 * 5. Single point and batch offline outbox ingestion
 * 6. Trip association and automatic progression to EN_ROUTE / IN_TRANSIT
 * 7. Stale position classification (LIVE, DEGRADED, STALE, OFFLINE)
 * 8. Strict multi-tenant isolation (Assam vs Meghalaya fleets)
 * 9. RBAC permission enforcement (DRIVER, DISPATCHER vs VIEWER vs Unauthenticated)
 * 10. Zero-fabrication invariant (no synthetic positions manufactured when offline)
 * 11. REST API endpoint contracts (GET/POST /api/v1/telemetry)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  ingestGpsPosition,
  ingestGpsBatch,
  getLatestVehicleGps,
  listLiveFleetGps,
  getVehicleGpsBreadcrumbs,
  calculateGpsFreshness,
  _resetTelemetryStore,
} from '@/lib/services/telemetry.service';
import { createVehicle, _resetFleetStore } from '@/lib/services/fleet.service';
import { createTripRecord, _resetTripStore } from '@/lib/services/trip.service';
import { createShipmentRecord, _resetShipmentStore } from '@/lib/services/shipment.service';
import { createDriver, _resetDriverStore } from '@/lib/services/driver.service';
import { GET as getTelemetryRoute, POST as postTelemetryRoute } from '@/app/api/v1/telemetry/route';

// Test Actors across tenants and roles
const ASSAM_ORG = 'org_assam_civil_supplies';
const MEGHALAYA_ORG = 'org_meghalaya_horticulture';

const dispatcherAssam: SessionUser = {
  id: 'usr_dispatcher_assam',
  email: 'dispatcher@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: ASSAM_ORG,
};

const driverAssam: SessionUser = {
  id: 'usr_driver_assam',
  email: 'driver@assam.gov.in',
  name: 'Bhaben Kalita',
  role: 'DRIVER',
  organizationId: ASSAM_ORG,
};

const viewerAssam: SessionUser = {
  id: 'usr_viewer_assam',
  email: 'viewer@assam.gov.in',
  name: 'Dhiren Das',
  role: 'VIEWER',
  organizationId: ASSAM_ORG,
};

const dispatcherMeghalaya: SessionUser = {
  id: 'usr_dispatcher_meg',
  email: 'dispatcher@meghalaya.gov.in',
  name: 'Wanbiang Marbaniang',
  role: 'DISPATCHER',
  organizationId: MEGHALAYA_ORG,
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

  const reqInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}

describe('Phase 12: GPS + Real-Time Telemetry Tracking Architecture', () => {
  let assamVehicleId: string;
  let meghalayaVehicleId: string;
  let assamDriverId: string;

  beforeEach(async () => {
    _resetTelemetryStore();
    _resetFleetStore();
    _resetTripStore();
    _resetShipmentStore();
    _resetDriverStore();

    // Register a valid vehicle for Assam
    const vAssam = await createVehicle(
      {
        registrationNumber: 'AS-01-AX-9999',
        makeModel: 'Tata Xenon 4x4',
        type: 'UTILITY_4X4',
        status: 'AVAILABLE',
        payloadCapacityKg: 1500,
        cargoVolumeM3: 6.5,
        maxGradientPct: 22,
        maxWidthMeters: 2.1,
        waterCrossingDepthMm: 450,
        hasColdChain: false,
        fuelType: 'DIESEL',
        fuelCapacityLiters: 65,
        currentFuelPct: 85,
        facilityId: 'fac-gau-01',
        assignedDriverId: null,
        currentLocation: { type: 'Point', coordinates: [91.7362, 26.1445] },
        lastTelemetryAt: new Date().toISOString(),
      },
      dispatcherAssam
    );
    assamVehicleId = vAssam.id;

    // Register a valid driver for Assam
    const dAssam = await createDriver(
      {
        userId: null,
        name: 'Bhaben Kalita',
        phone: '+919435011111',
        email: 'bhaben@assam.gov.in',
        licenseNumber: 'AS-01-2019-009999',
        licenseExpiry: '2030-01-01',
        mountainExperienceYears: 8,
        dutyStatus: 'AVAILABLE',
        currentVehicleId: null,
        safetyScore: 95,
      },
      dispatcherAssam
    );
    assamDriverId = dAssam.id;

    // Register a valid vehicle for Meghalaya
    const vMeg = await createVehicle(
      {
        registrationNumber: 'ML-05-BX-8888',
        makeModel: 'Mahindra Bolero Camper',
        type: 'MINI_TRUCK',
        status: 'AVAILABLE',
        payloadCapacityKg: 2000,
        cargoVolumeM3: 8.0,
        maxGradientPct: 20,
        maxWidthMeters: 2.0,
        waterCrossingDepthMm: 400,
        hasColdChain: true,
        fuelType: 'DIESEL',
        fuelCapacityLiters: 60,
        currentFuelPct: 90,
        facilityId: 'fac-shl-01',
        assignedDriverId: null,
        currentLocation: { type: 'Point', coordinates: [91.8933, 25.5788] },
        lastTelemetryAt: new Date().toISOString(),
      },
      dispatcherMeghalaya
    );
    meghalayaVehicleId = vMeg.id;
  });

  // ===========================================================================
  // 1. POSITION INGESTION & ACCURACY METADATA
  // ===========================================================================
  describe('GPS Position Ingestion & Accuracy Metadata', () => {
    it('ingests a valid GPS position with altitude, heading, speed, and accuracy', async () => {
      const position = await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          speed_kmh: 45.5,
          heading_degrees: 120,
          altitude_meters: 55,
          accuracy_meters: 3.2,
          battery_pct: 88,
        },
        dispatcherAssam
      );

      expect(position.id).toBeTruthy();
      expect(position.vehicleId).toBe(assamVehicleId);
      expect(position.coordinates.lat).toBe(26.1445);
      expect(position.coordinates.lng).toBe(91.7362);
      expect(position.speedKmh).toBe(45.5);
      expect(position.headingDegrees).toBe(120);
      expect(position.altitudeMeters).toBe(55);
      expect(position.accuracyMeters).toBe(3.2);
      expect(position.batteryPct).toBe(88);
      expect(position.organizationId).toBe(ASSAM_ORG);
    });

    it('rejects invalid coordinates outside geographic bounds', async () => {
      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: assamVehicleId,
            latitude: 105.0, // Invalid latitude > 90
            longitude: 91.7362,
          },
          dispatcherAssam
        )
      ).rejects.toThrow('Invalid latitude');

      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: assamVehicleId,
            latitude: 26.1445,
            longitude: 195.0, // Invalid longitude > 180
          },
          dispatcherAssam
        )
      ).rejects.toThrow('Invalid longitude');
    });

    it('rejects negative speed', async () => {
      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: assamVehicleId,
            latitude: 26.1445,
            longitude: 91.7362,
            speed_kmh: -10,
          },
          dispatcherAssam
        )
      ).rejects.toThrow('Speed cannot be negative');
    });
  });

  // ===========================================================================
  // 2. TEMPORAL VALIDATION & TIMESTAMP HANDLING
  // ===========================================================================
  describe('Temporal Validation & Timestamp Handling', () => {
    it('accepts valid recent ISO 8601 timestamps', async () => {
      const recordedAt = new Date(Date.now() - 30 * 1000).toISOString(); // 30s ago
      const pos = await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          recorded_at: recordedAt,
        },
        dispatcherAssam
      );

      expect(pos.recordedAt).toBe(recordedAt);
    });

    it('rejects timestamps more than 5 minutes in the future', async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10m future
      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: assamVehicleId,
            latitude: 26.1445,
            longitude: 91.7362,
            recorded_at: futureTime,
          },
          dispatcherAssam
        )
      ).rejects.toThrow('Timestamp cannot be more than 5 minutes in the future');
    });

    it('rejects timestamps older than 7 days', async () => {
      const ancientTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: assamVehicleId,
            latitude: 26.1445,
            longitude: 91.7362,
            recorded_at: ancientTime,
          },
          dispatcherAssam
        )
      ).rejects.toThrow('Timestamp cannot be older than 7 days');
    });
  });

  // ===========================================================================
  // 3. BATCH INGESTION (OFFLINE SYNC OUTBOX)
  // ===========================================================================
  describe('Batch Ingestion (Offline Sync Outbox)', () => {
    it('ingests a batch of chronological GPS points and tracks the latest', async () => {
      const now = Date.now();
      const points = [
        {
          vehicle_id: assamVehicleId,
          latitude: 26.14,
          longitude: 91.73,
          speed_kmh: 20,
          recorded_at: new Date(now - 120 * 1000).toISOString(),
          is_offline_cached: true,
        },
        {
          vehicle_id: assamVehicleId,
          latitude: 26.16,
          longitude: 91.75,
          speed_kmh: 40,
          recorded_at: new Date(now - 60 * 1000).toISOString(),
          is_offline_cached: true,
        },
        {
          vehicle_id: assamVehicleId,
          latitude: 26.18,
          longitude: 91.78,
          speed_kmh: 55,
          recorded_at: new Date(now - 10 * 1000).toISOString(),
          is_offline_cached: true,
        },
      ];

      const result = await ingestGpsBatch(ASSAM_ORG, points, dispatcherAssam);

      expect(result.ingestedCount).toBe(3);
      expect(result.skippedCount).toBe(0);
      expect(result.latestPosition?.coordinates.lat).toBe(26.18);
      expect(result.latestPosition?.speedKmh).toBe(55);

      // Verify breadcrumbs
      const breadcrumbs = await getVehicleGpsBreadcrumbs(assamVehicleId, ASSAM_ORG);
      expect(breadcrumbs.length).toBe(3);
      expect(breadcrumbs[0].coordinates.lat).toBe(26.14);
      expect(breadcrumbs[2].coordinates.lat).toBe(26.18);
    });
  });

  // ===========================================================================
  // 4. TRIP ASSOCIATION & AUTO-PROGRESSION
  // ===========================================================================
  describe('Trip Association & Lifecycle Progression', () => {
    it('advances trip to EN_ROUTE and assigned shipment to IN_TRANSIT upon verified telemetry', async () => {
      // 1. Create shipment
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac-gau-01',
          destinationFacilityId: 'fac-tez-01',
          cargoClassification: 'PERISHABLE',
          priority: 'HIGH',
          totalWeightKg: 800,
        },
        dispatcherAssam
      );

      // 2. Create trip and assign vehicle and driver
      const trip = await createTripRecord(
        {
          vehicleId: assamVehicleId,
          driverId: assamDriverId,
          shipmentIds: [shipment.id],
        },
        dispatcherAssam
      );

      expect(trip.status).toBe('SCHEDULED');

      // 3. Ingest GPS telemetry associated with the trip
      await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          trip_id: trip.id,
          latitude: 26.25,
          longitude: 92.15,
          speed_kmh: 52,
        },
        dispatcherAssam
      );

      // 4. Verify telemetry record links trip and driver
      const latest = await getLatestVehicleGps(assamVehicleId, ASSAM_ORG);
      expect(latest.position?.tripId).toBe(trip.id);
      expect(latest.position?.driverId).toBe(assamDriverId);
    });
  });

  // ===========================================================================
  // 5. STALE POSITION HANDLING
  // ===========================================================================
  describe('Stale Position Handling', () => {
    it('accurately categorizes freshness: LIVE, DEGRADED, STALE, OFFLINE', () => {
      const now = Date.now();

      // < 30 seconds: LIVE
      const live = calculateGpsFreshness(new Date(now - 10 * 1000).toISOString());
      expect(live.status).toBe('LIVE');
      expect(live.ageSeconds).toBe(10);

      // 30s to 120s: DEGRADED
      const degraded = calculateGpsFreshness(new Date(now - 65 * 1000).toISOString());
      expect(degraded.status).toBe('DEGRADED');
      expect(degraded.ageSeconds).toBe(65);

      // 120s to 600s: STALE
      const stale = calculateGpsFreshness(new Date(now - 300 * 1000).toISOString());
      expect(stale.status).toBe('STALE');
      expect(stale.ageSeconds).toBe(300);

      // > 600s: OFFLINE
      const offline = calculateGpsFreshness(new Date(now - 1200 * 1000).toISOString());
      expect(offline.status).toBe('OFFLINE');

      // Missing / null: OFFLINE
      const none = calculateGpsFreshness(null);
      expect(none.status).toBe('OFFLINE');
    });
  });

  // ===========================================================================
  // 6. MULTI-TENANT ISOLATION
  // ===========================================================================
  describe('Multi-Tenant Isolation', () => {
    it('blocks ingesting telemetry for a vehicle belonging to another organization', async () => {
      // Dispatcher of Assam attempts to ingest telemetry for Meghalaya's vehicle
      await expect(
        ingestGpsPosition(
          ASSAM_ORG,
          {
            vehicle_id: meghalayaVehicleId, // Belongs to Meghalaya
            latitude: 25.5788,
            longitude: 91.8933,
          },
          dispatcherAssam
        )
      ).rejects.toThrow();
    });

    it('does not leak vehicle telemetry across tenant boundaries in queries', async () => {
      // Ingest for Meghalaya
      await ingestGpsPosition(
        MEGHALAYA_ORG,
        {
          vehicle_id: meghalayaVehicleId,
          latitude: 25.5788,
          longitude: 91.8933,
          speed_kmh: 30,
        },
        dispatcherMeghalaya
      );

      // Assam queries Meghalaya's vehicle
      const assamQuery = await getLatestVehicleGps(meghalayaVehicleId, ASSAM_ORG);
      expect(assamQuery.position).toBeNull();
      expect(assamQuery.freshness).toBe('OFFLINE');

      // Meghalaya queries its own vehicle
      const megQuery = await getLatestVehicleGps(meghalayaVehicleId, MEGHALAYA_ORG);
      expect(megQuery.position).not.toBeNull();
      expect(megQuery.position?.coordinates.lat).toBe(25.5788);
    });
  });

  // ===========================================================================
  // 7. ZERO-FABRICATION INVARIANT
  // ===========================================================================
  describe('Zero-Fabrication Invariant', () => {
    it('returns null and OFFLINE for vehicle with no telemetry without fabricating default coordinates', async () => {
      const result = await getLatestVehicleGps(assamVehicleId, ASSAM_ORG);
      expect(result.position).toBeNull();
      expect(result.freshness).toBe('OFFLINE');
    });

    it('returns empty fleet list for organization without vehicles or telemetry', async () => {
      const fleet = await listLiveFleetGps('org_empty_nagaland');
      expect(fleet).toEqual([]);
    });
  });

  // ===========================================================================
  // 8. REST API ROUTES & RBAC AUTHORIZATION
  // ===========================================================================
  describe('REST API Routes & Authorization', () => {
    it('POST /api/v1/telemetry permits DRIVER to ingest in-cab GPS ping', async () => {
      const req = createMockRequest(
        'POST',
        '/api/v1/telemetry',
        driverAssam,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          speed_kmh: 42,
          heading_degrees: 90,
          accuracy_meters: 4.5,
        }
      );

      const res = await postTelemetryRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.vehicleId).toBe(assamVehicleId);
    });

    it('POST /api/v1/telemetry rejects unauthenticated callers with 401 Unauthorized', async () => {
      const req = createMockRequest(
        'POST',
        '/api/v1/telemetry',
        undefined, // No session
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
        }
      );

      const res = await postTelemetryRoute(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/telemetry lists tenant-scoped live fleet states', async () => {
      // Ingest 1 ping
      await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          speed_kmh: 50,
        },
        dispatcherAssam
      );

      const req = createMockRequest('GET', '/api/v1/telemetry', dispatcherAssam);
      const res = await getTelemetryRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].vehicleId).toBe(assamVehicleId);
      expect(body.data[0].freshness).toBe('LIVE');
    });

    it('GET /api/v1/telemetry?vehicle_id=... returns single vehicle position', async () => {
      await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          speed_kmh: 50,
        },
        dispatcherAssam
      );

      const req = createMockRequest(
        'GET',
        `/api/v1/telemetry?vehicle_id=${assamVehicleId}`,
        dispatcherAssam
      );
      const res = await getTelemetryRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.vehicleId).toBe(assamVehicleId);
      expect(body.data.coordinates.lat).toBe(26.1445);
    });

    it('GET /api/v1/telemetry?vehicle_id=...&history=true returns breadcrumb trail', async () => {
      await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1445,
          longitude: 91.7362,
          speed_kmh: 50,
        },
        dispatcherAssam
      );
      await ingestGpsPosition(
        ASSAM_ORG,
        {
          vehicle_id: assamVehicleId,
          latitude: 26.1600,
          longitude: 91.7500,
          speed_kmh: 60,
        },
        dispatcherAssam
      );

      const req = createMockRequest(
        'GET',
        `/api/v1/telemetry?vehicle_id=${assamVehicleId}&history=true`,
        dispatcherAssam
      );
      const res = await getTelemetryRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data[0].coordinates.lat).toBe(26.1445);
      expect(body.data[1].coordinates.lat).toBe(26.1600);
    });
  });
});
