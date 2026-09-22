/**
 * AuraNER / NER-Route AI — Phase 11: Maps + Routing Verification Test Suite
 * 
 * Verifies production-grade map and routing capabilities:
 * 1. RoutingService & GeocodingService provider abstraction compliance
 * 2. Real provider error & timeout contracts (ProviderUnavailableError, ProviderTimeoutError, RouteNotFoundError)
 * 3. Zero-fabrication invariant on provider failure (no synthetic geometry generated)
 * 4. Route calculation, distance, duration, elevation, and segments extraction
 * 5. Route provenance tracking (providerName, latency, calculationTimestamp, cacheStatus)
 * 6. Route domain persistence (routes, route_versions, route_segments)
 * 7. Route versioning lifecycle (version 1 -> version 2 upon recalculation/detour)
 * 8. Multi-tenant organization isolation (Assam vs Meghalaya routes)
 * 9. Multi-point distance and duration matrix calculations
 * 10. Forward search and reverse geocoding resolution
 * 11. REST API security, validation, and role authorization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  RoutingService,
  GeocodingService,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RouteNotFoundError,
  MockTestRoutingService,
  MockTestGeocodingService,
  setRoutingServiceForTesting,
  setGeocodingServiceForTesting,
} from '@/lib/routing';
import {
  planRoute,
  saveRoute,
  createRouteVersion,
  getRouteById,
  listRoutes,
  calculateMatrix,
  _resetRouteStore,
} from '@/lib/services/route.service';
import {
  GET as getRoutesRoute,
  POST as postRoutesRoute,
} from '@/app/api/v1/routes/route';
import {
  GET as getRouteIdRoute,
  POST as postRouteIdRoute,
} from '@/app/api/v1/routes/[id]/route';
import {
  POST as postPlanRoute,
} from '@/app/api/v1/routes/plan/route';
import {
  POST as postMatrixRoute,
} from '@/app/api/v1/routes/matrix/route';
import {
  GET as getGeocodingRoute,
} from '@/app/api/v1/geocoding/route';

// Test Actors across tenants and roles
const SUPER_ADMIN: SessionUser = {
  id: 'usr_super_admin',
  email: 'director.disaster@mha.gov.in',
  name: 'Director Sharma',
  role: 'SUPER_ADMIN',
  organizationId: null,
};

const DISPATCHER_ASSAM: SessionUser = {
  id: 'usr_dispatcher_assam',
  email: 'dispatcher.gau@assam.gov.in',
  name: 'Dispatcher Kalita',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const VIEWER_ASSAM: SessionUser = {
  id: 'usr_viewer_assam',
  email: 'auditor@assam.gov.in',
  name: 'Auditor Das',
  role: 'VIEWER',
  organizationId: 'org_assam_civil_supplies',
};

const ORG_ADMIN_MEGHALAYA: SessionUser = {
  id: 'usr_admin_meghalaya',
  email: 'director@meghalaya.gov.in',
  name: 'Director Sangma',
  role: 'ORG_ADMIN',
  organizationId: 'org_meghalaya_civil_supplies',
};

function createMockNextRequest(url: string, method = 'GET', body?: unknown, user?: SessionUser): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (user) {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    headers['cookie'] = `${SESSION_COOKIE_NAME}=${token}`;
    headers['authorization'] = `Bearer ${token}`;
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 11: Maps + Routing Architecture', () => {
  let mockRouting: MockTestRoutingService;
  let mockGeocoding: MockTestGeocodingService;

  beforeEach(() => {
    _resetRouteStore();
    mockRouting = new MockTestRoutingService();
    mockGeocoding = new MockTestGeocodingService();
    setRoutingServiceForTesting(mockRouting);
    setGeocodingServiceForTesting(mockGeocoding);
  });

  // ===========================================================================
  // 1. ROUTING SERVICE CONTRACT & CALCULATION
  // ===========================================================================
  describe('RoutingService Calculation & Provenance', () => {
    it('calculates a valid road route with geometry, distance, duration, and segments', async () => {
      const origin = { lat: 26.1445, lng: 91.7362 }; // Guwahati
      const destination = { lat: 26.6338, lng: 92.8004 }; // Tezpur

      const result = await planRoute(origin, destination);

      expect(result.geometry.length).toBeGreaterThanOrEqual(2);
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThan(0);
      expect(result.segments.length).toBeGreaterThanOrEqual(1);
      expect(result.provenance).toBeDefined();
      expect(result.provenance.providerName).toContain('Mock Test Routing Engine');
      expect(result.provenance.cacheStatus).toBe('LIVE');
      expect(result.provenance.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.provenance.routeHash).toBeDefined();
    });

    it('parses structured route segments with terrain classification and road condition scores', async () => {
      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 27.2647, lng: 92.4178 }; // Bomdila (Mountain)

      const result = await planRoute(origin, destination);

      const segment = result.segments[0];
      expect(segment.segmentOrder).toBe(1);
      expect(segment.name).toBeDefined();
      expect(segment.highwayCode).toBeDefined();
      expect(segment.distanceKm).toBeGreaterThan(0);
      expect(segment.durationMinutes).toBeGreaterThan(0);
      expect(['PLAIN', 'HILLY', 'MOUNTAINOUS']).toContain(segment.terrain);
      expect(segment.roadConditionScore).toBeGreaterThanOrEqual(0);
      expect(segment.roadConditionScore).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // 2. TIMEOUT, ERROR HANDLING & ZERO FABRICATION
  // ===========================================================================
  describe('Provider Errors & Zero-Fabrication Invariants', () => {
    it('throws ProviderTimeoutError when routing provider exceeds deadline without fabricating routes', async () => {
      mockRouting.setSimulateTimeout(true);

      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 26.6338, lng: 92.8004 };

      await expect(planRoute(origin, destination)).rejects.toThrow(ProviderTimeoutError);
      await expect(planRoute(origin, destination)).rejects.toThrow('timed out after 8000ms');
    });

    it('throws ProviderUnavailableError on network failure without falling back to synthetic geometry', async () => {
      mockRouting.setSimulateFailure(true);

      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 26.6338, lng: 92.8004 };

      await expect(planRoute(origin, destination)).rejects.toThrow(ProviderUnavailableError);
      await expect(planRoute(origin, destination)).rejects.toThrow('currently unavailable');
    });

    it('throws RouteNotFoundError when no navigable road exists between points', async () => {
      mockRouting.setSimulateNotFound(true);

      const origin = { lat: 26.1445, lng: 91.7362 };
      const destination = { lat: 26.6338, lng: 92.8004 };

      await expect(planRoute(origin, destination)).rejects.toThrow(RouteNotFoundError);
      await expect(planRoute(origin, destination)).rejects.toThrow('No road route found');
    });
  });

  // ===========================================================================
  // 3. GEOCODING SERVICE ABSTRACTION
  // ===========================================================================
  describe('GeocodingService Resolution', () => {
    it('geocodes place names into coordinates with state and district metadata', async () => {
      const results = await mockGeocoding.geocode('Guwahati');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('Guwahati');
      expect(results[0].lat).toBeCloseTo(26.14, 1);
      expect(results[0].lng).toBeCloseTo(91.73, 1);
      expect(results[0].state).toBe('Assam');
      expect(results[0].provenance.providerName).toBeDefined();
    });

    it('reverse geocodes coordinates into location names', async () => {
      const result = await mockGeocoding.reverseGeocode({ lat: 26.1445, lng: 91.7362 });

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(26.1445);
      expect(result?.lng).toBe(91.7362);
    });
  });

  // ===========================================================================
  // 4. ROUTE DOMAIN PERSISTENCE & VERSIONING
  // ===========================================================================
  describe('Route Persistence, Versions & Segments', () => {
    it('saves a route corridor creating Route, RouteVersion 1, and RouteSegments', async () => {
      const route = await saveRoute(
        {
          name: 'Guwahati - Tezpur Strategic Food Corridor',
          originLocationId: 'loc-gau',
          destinationLocationId: 'loc-tez',
          corridorHighwayCode: 'NH-27',
          isTemplate: true,
          originCoords: { lat: 26.1445, lng: 91.7362 },
          destinationCoords: { lat: 26.6338, lng: 92.8004 },
        },
        DISPATCHER_ASSAM
      );

      expect(route.id).toBeDefined();
      expect(route.organizationId).toBe('org_assam_civil_supplies');
      expect(route.name).toBe('Guwahati - Tezpur Strategic Food Corridor');
      expect(route.isTemplate).toBe(true);
      expect(route.versions.length).toBe(1);

      const v1 = route.versions[0];
      expect(v1.versionNumber).toBe(1);
      expect(v1.isActive).toBe(true);
      expect(v1.totalDistanceKm).toBeGreaterThan(0);
      expect(v1.segments.length).toBeGreaterThanOrEqual(1);
      expect(v1.provenance).toBeDefined();
    });

    it('creates a new route version (Version 2) upon route recalculation/detour', async () => {
      const route = await saveRoute(
        {
          name: 'Guwahati - Bomdila Mountain Pass',
          originLocationId: 'loc-gau',
          destinationLocationId: 'loc-bom',
          corridorHighwayCode: 'NH-13',
          originCoords: { lat: 26.1445, lng: 91.7362 },
          destinationCoords: { lat: 27.2647, lng: 92.4178 },
        },
        DISPATCHER_ASSAM
      );

      expect(route.versions.length).toBe(1);
      expect(route.versions[0].versionNumber).toBe(1);

      // Create Version 2 due to landslide detour
      const v2 = await createRouteVersion(
        route.id,
        {
          originCoords: { lat: 26.1445, lng: 91.7362 },
          destinationCoords: { lat: 27.2647, lng: 92.4178 },
          changeReason: 'Detour around active Sela Pass rockfall hazard',
        },
        DISPATCHER_ASSAM
      );

      expect(v2.versionNumber).toBe(2);
      expect(v2.isActive).toBe(true);
      expect(v2.changeReason).toContain('Sela Pass rockfall');

      const updatedRoute = await getRouteById(route.id, DISPATCHER_ASSAM);
      expect(updatedRoute.activeVersionId).toBe(v2.id);
      expect(updatedRoute.versions.length).toBe(2);

      const v1Refreshed = updatedRoute.versions.find((v) => v.versionNumber === 1);
      expect(v1Refreshed?.isActive).toBe(false);
    });
  });

  // ===========================================================================
  // 5. MULTI-TENANT ISOLATION
  // ===========================================================================
  describe('Multi-Tenant Organization Isolation', () => {
    it('isolates saved routes between Assam and Meghalaya organizations', async () => {
      const assamRoute = await saveRoute(
        {
          name: 'Assam Valley Route',
          originLocationId: 'loc-gau',
          destinationLocationId: 'loc-tez',
          originCoords: { lat: 26.1445, lng: 91.7362 },
          destinationCoords: { lat: 26.6338, lng: 92.8004 },
        },
        DISPATCHER_ASSAM
      );

      const meghalayaRoute = await saveRoute(
        {
          name: 'Meghalaya Hill Corridor',
          originLocationId: 'loc-shi',
          destinationLocationId: 'loc-tur',
          originCoords: { lat: 25.5788, lng: 91.8933 },
          destinationCoords: { lat: 25.5167, lng: 90.2167 },
        },
        ORG_ADMIN_MEGHALAYA
      );

      const assamList = await listRoutes({}, DISPATCHER_ASSAM);
      expect(assamList.routes.some((r) => r.id === assamRoute.id)).toBe(true);
      expect(assamList.routes.some((r) => r.id === meghalayaRoute.id)).toBe(false);

      const meghalayaList = await listRoutes({}, ORG_ADMIN_MEGHALAYA);
      expect(meghalayaList.routes.some((r) => r.id === meghalayaRoute.id)).toBe(true);
      expect(meghalayaList.routes.some((r) => r.id === assamRoute.id)).toBe(false);

      // Cross-tenant get throws ForbiddenError
      await expect(getRouteById(assamRoute.id, ORG_ADMIN_MEGHALAYA)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // 6. DISTANCE & TIME MATRIX CALCULATION
  // ===========================================================================
  describe('Distance & Time Matrix Calculations', () => {
    it('computes distance and duration matrices between multiple coordinates', async () => {
      const origins = [
        { lat: 26.1445, lng: 91.7362 }, // Guwahati
        { lat: 26.7509, lng: 94.2037 }, // Jorhat
      ];
      const destinations = [
        { lat: 26.6338, lng: 92.8004 }, // Tezpur
        { lat: 27.4728, lng: 94.9120 }, // Dibrugarh
      ];

      const matrix = await calculateMatrix(origins, destinations);

      expect(matrix.distancesKm.length).toBe(2);
      expect(matrix.distancesKm[0].length).toBe(2);
      expect(matrix.durationsMinutes.length).toBe(2);
      expect(matrix.durationsMinutes[0].length).toBe(2);
      expect(matrix.provenance).toBeDefined();
    });
  });

  // ===========================================================================
  // 7. REST API ENDPOINTS
  // ===========================================================================
  describe('REST API Routes & Capability Gating', () => {
    it('POST /api/v1/routes/plan calculates a route with provenance metadata', async () => {
      const req = createMockNextRequest(
        '/api/v1/routes/plan',
        'POST',
        {
          origin_id: 'Guwahati',
          destination_id: 'Tezpur',
          origin_coords: { lat: 26.1445, lng: 91.7362 },
          destination_coords: { lat: 26.6338, lng: 92.8004 },
        },
        DISPATCHER_ASSAM
      );

      const res = await postPlanRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.distanceKm).toBeGreaterThan(0);
      expect(json.data.durationMinutes).toBeGreaterThan(0);
      expect(json.data.provenance).toBeDefined();
    });

    it('POST /api/v1/routes permits DISPATCHER to save route corridors', async () => {
      const req = createMockNextRequest(
        '/api/v1/routes',
        'POST',
        {
          name: 'Guwahati - Tezpur Highway',
          origin_location_id: 'loc-gau',
          destination_location_id: 'loc-tez',
          origin_coords: { lat: 26.1445, lng: 91.7362 },
          destination_coords: { lat: 26.6338, lng: 92.8004 },
        },
        DISPATCHER_ASSAM
      );

      const res = await postRoutesRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.versions.length).toBe(1);
    });

    it('POST /api/v1/routes denies VIEWER from saving routes (403 Forbidden)', async () => {
      const req = createMockNextRequest(
        '/api/v1/routes',
        'POST',
        {
          name: 'Unauthorized Route Corridor',
          origin_location_id: 'loc-gau',
          destination_location_id: 'loc-tez',
          origin_coords: { lat: 26.1445, lng: 91.7362 },
          destination_coords: { lat: 26.6338, lng: 92.8004 },
        },
        VIEWER_ASSAM
      );

      const res = await postRoutesRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain('Missing required permission: shipments:create');
    });

    it('GET /api/v1/geocoding supports forward search and reverse coordinates lookup', async () => {
      // Forward search
      const reqSearch = createMockNextRequest('/api/v1/geocoding?q=Guwahati', 'GET');
      const resSearch = await getGeocodingRoute(reqSearch);
      expect(resSearch.status).toBe(200);
      const jsonSearch = await resSearch.json();
      expect(jsonSearch.data.length).toBeGreaterThanOrEqual(1);

      // Reverse lookup
      const reqRev = createMockNextRequest('/api/v1/geocoding?lat=26.1445&lng=91.7362', 'GET');
      const resRev = await getGeocodingRoute(reqRev);
      expect(resRev.status).toBe(200);
      const jsonRev = await resRev.json();
      expect(jsonRev.data.lat).toBe(26.1445);
    });
  });
});
