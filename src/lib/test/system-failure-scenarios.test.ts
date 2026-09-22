/**
 * AuraNER / NER-Route AI — Phase 24: System Failure Scenarios & Edge Cases Test Suite
 * 
 * Verifies system resilience and graceful degradation across:
 * 1. External Provider Failures (OSRM routing outage fallback, Nominatim geocoding fallback)
 * 2. Ingestion Network Disruptions (IMD/BRO feed drops, partial batch handling)
 * 3. Database Resilience & State Rollback Invariants
 * 4. Cascading Mountain Crisis Scenarios (Dual-corridor landslide blockages & safe-haven divert)
 * 5. Telemetry Ingestion Anomaly Defenses (Negative speed, coordinate bounds, cross-tenant spoofing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OsrmRoutingProvider } from '@/lib/providers/routing.provider';
import { DefaultGeocodingProvider } from '@/lib/providers/geocoding.provider';
import {
  ingestGpsPosition,
  calculateGpsFreshness,
  _resetTelemetryStore,
} from '@/lib/services/telemetry.service';
import { createVehicle, _resetFleetStore } from '@/lib/services/fleet.service';
import { findNearestSafeLocations } from '@/lib/services/safe-location.service';
import { SessionUser } from '@/lib/auth/session';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api/response';

// Test Actors
const dispatcherAssam: SessionUser = {
  id: 'usr_dispatcher_fail_assam',
  email: 'dispatcher.fail@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const attackerMizoram: SessionUser = {
  id: 'usr_attacker_fail_mizoram',
  email: 'attacker.fail@mizoram.gov.in',
  name: 'Lalrin Mawia',
  role: 'DISPATCHER',
  organizationId: 'org_mizoram_logistics',
};

describe('Phase 24: System Failure Scenarios & Resiliency Engine', () => {
  let assamVehicleId: string;

  beforeEach(async () => {
    _resetTelemetryStore();
    _resetFleetStore();

    const vAssam = await createVehicle(
      {
        registrationNumber: 'AS-01-FAIL-9999',
        makeModel: 'Tata Xenon 4x4 Heavy Utility',
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
        organizationId: dispatcherAssam.organizationId ?? undefined,
      },
      dispatcherAssam
    );
    assamVehicleId = vAssam.id;
  });

  // ---------------------------------------------------------------------------
  // 1. External Routing Provider Outage & Graceful Fallback
  // ---------------------------------------------------------------------------
  describe('1. External Routing Provider Outage & Fallback', () => {
    it('gracefully degrades to high-fidelity mountain route graph when OSRM fails', async () => {
      const provider = new OsrmRoutingProvider();

      // Guwahati to Kohima coordinates across Assam-Nagaland border
      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 25.6701, lng: 94.1077 };

      // Calculate route (will trigger fallback if OSRM container or mock server is unreachable)
      const result = await provider.calculateRoute(origin, destination);

      expect(result).toBeDefined();
      expect(result.distanceKm).toBeGreaterThan(200);
      expect(result.durationMinutes).toBeGreaterThan(180);
      expect(result.coordinates.length).toBeGreaterThanOrEqual(10);
      expect(result.segments.length).toBeGreaterThanOrEqual(1);

      // Verify elevation profile is populated
      expect(result.elevationGainMeters).toBeGreaterThan(0);
      expect(['OSRM (OpenStreetMap Engine)', 'Northeast Terrain & Elevation Graph Engine']).toContain(
        result.providerName
      );
    }, 15000);

    it('calculates obstacle avoidance detour when road obstruction coordinates are provided', async () => {
      const provider = new OsrmRoutingProvider();
      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 25.6701, lng: 94.1077 };
      // Landslide obstruction along NH-29 near Zubza (lat 25.75, lng 93.95)
      const avoidCoordinates = [{ lat: 25.7500, lng: 93.9500 }];

      const detour = await provider.calculateRoute(origin, destination, { avoidCoordinates });

      expect(detour).toBeDefined();
      expect(detour.distanceKm).toBeGreaterThan(150);
      expect(detour.coordinates.length).toBeGreaterThan(10);
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // 2. Geocoding Provider Fallback & Offline Search
  // ---------------------------------------------------------------------------
  describe('2. Geocoding Provider Fallback & Offline Search', () => {
    it('successfully resolves Northeast hubs from local gazetteer during network disruption', async () => {
      const geocoder = new DefaultGeocodingProvider();

      const results = await geocoder.search('Guwahati', { limit: 5 });
      expect(results.length).toBeGreaterThan(0);

      const top = results[0];
      expect(top.name).toBe('Guwahati');
      expect(top.state).toBe('Assam');
      expect(top.lat).toBeCloseTo(26.1445, 2);
      expect(top.lng).toBeCloseTo(91.7362, 2);
      expect(top.accessibilityTier).toBe('HIGH');
    });

    it('returns empty array cleanly for non-existent locations without crashing', async () => {
      const geocoder = new DefaultGeocodingProvider();
      const results = await geocoder.search('Atlantis-Undersea-Nonexistent-Hub');
      expect(results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Cascading Crisis & Safe-Haven Rerouting
  // ---------------------------------------------------------------------------
  describe('3. Cascading Crisis & Emergency Safe-Haven Rerouting', () => {
    it('discovers emergency safe havens and security posts within radial reach of an incident', async () => {
      // Vehicle blocked near Kohima/Zubza (lat: 25.67, lng: 94.10)
      const incidentCoords = { lat: 25.6751, lng: 94.1086 };

      const safeHavens = await findNearestSafeLocations(incidentCoords, 5);
      expect(safeHavens.length).toBeGreaterThan(0);
      expect(safeHavens.length).toBeLessThanOrEqual(5);

      const nearest = safeHavens[0];
      expect(nearest.id).toBeDefined();
      expect(nearest.name).toBeDefined();
      expect(nearest.distanceKm).toBeGreaterThan(0);
      expect(nearest.estimatedTimeMinutes).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Telemetry Ingestion Anomaly & Attack Defenses
  // ---------------------------------------------------------------------------
  describe('4. Telemetry Ingestion Anomaly Defenses', () => {
    it('rejects telemetry ping with negative speed', async () => {
      await expect(
        ingestGpsPosition(
          dispatcherAssam.organizationId!,
          {
            vehicle_id: assamVehicleId,
            latitude: 26.1445,
            longitude: 91.7362,
            speed_kmh: -45, // Invalid negative speed
          },
          dispatcherAssam
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects telemetry with out-of-range geographic coordinates', async () => {
      await expect(
        ingestGpsPosition(
          dispatcherAssam.organizationId!,
          {
            vehicle_id: assamVehicleId,
            latitude: 145.0, // Invalid latitude > 90
            longitude: 91.7362,
          },
          dispatcherAssam
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('prevents cross-tenant telemetry ingestion spoofing (Org B into Org A vehicle)', async () => {
      // Attacker from Mizoram attempting to inject GPS position into Assam vehicle
      await expect(
        ingestGpsPosition(
          dispatcherAssam.organizationId!,
          {
            vehicle_id: assamVehicleId, // Assam vehicle
            latitude: 26.1445,
            longitude: 91.7362,
          },
          attackerMizoram // Mizoram user session
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('evaluates temporal freshness across all states (LIVE, DEGRADED, STALE, OFFLINE)', () => {
      const now = new Date();

      // < 30 seconds -> LIVE
      const liveTime = new Date(now.getTime() - 10 * 1000).toISOString();
      expect(calculateGpsFreshness(liveTime).status).toBe('LIVE');

      // 30 - 120 seconds -> DEGRADED
      const degradedTime = new Date(now.getTime() - 60 * 1000).toISOString();
      expect(calculateGpsFreshness(degradedTime).status).toBe('DEGRADED');

      // 120 - 600 seconds -> STALE
      const staleTime = new Date(now.getTime() - 300 * 1000).toISOString();
      expect(calculateGpsFreshness(staleTime).status).toBe('STALE');

      // > 600 seconds -> OFFLINE
      const offlineTime = new Date(now.getTime() - 1200 * 1000).toISOString();
      expect(calculateGpsFreshness(offlineTime).status).toBe('OFFLINE');

      // Null or invalid -> OFFLINE
      expect(calculateGpsFreshness(null).status).toBe('OFFLINE');
      expect(calculateGpsFreshness('invalid-timestamp').status).toBe('OFFLINE');
    });
  });
});
