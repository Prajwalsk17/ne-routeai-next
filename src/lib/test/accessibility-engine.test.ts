/**
 * AuraNER / NER-Route AI — Phase 16: Accessibility Engine Test Suite
 * 
 * Verifies production-grade accessibility intelligence for Northeast India:
 * 1. Administrative Declaration Lifecycle (SDMA, BRO, PWD cutoff declarations)
 * 2. Zero-Fabrication Invariant (unobserved coordinates return UNKNOWN, no synthetic data)
 * 3. Route Corridor Passability & Bottleneck Detection (limiting tier, vehicle requirement)
 * 4. Facility Ingress & Dock Profiling (dock clearance, weight capacity, 4WD)
 * 5. Uncertainty & Stale-Data Handling (confidence tracking, STALE warnings for >48h data)
 * 6. Actionable Accessibility Warnings (village isolated, bridge out, convoy escort)
 * 7. REST API Contracts & RBAC Authorization (data:read, data:ingest)
 * 8. Backward Compatibility (legacy getAccessibility function)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { RouteSegmentDetail } from '@/lib/providers/types';
import {
  assessAccessibility,
  createAccessibilityDeclaration,
  listAccessibilityDeclarations,
  getAccessibilityDeclarationById,
  updateAccessibilityDeclaration,
  resolveAccessibilityDeclaration,
  _resetAccessibilityStore,
} from '@/lib/services/accessibility.service';
import { getAccessibility } from '@/lib/engines/accessibility-engine';
import { POST as postAssessRoute } from '@/app/api/v1/accessibility/assess/route';
import {
  GET as getDeclarationsRoute,
  POST as postDeclarationsRoute,
} from '@/app/api/v1/accessibility/declarations/route';
import {
  GET as getDeclarationItemRoute,
  PATCH as patchDeclarationItemRoute,
} from '@/app/api/v1/accessibility/declarations/[id]/route';

// Test Actors
const superAdmin: SessionUser = {
  id: 'usr_super_admin',
  email: 'director@mha.gov.in',
  name: 'Director Sharma',
  role: 'SUPER_ADMIN',
  organizationId: null,
};

const dispatcherAssam: SessionUser = {
  id: 'usr_dispatcher_assam',
  email: 'dispatcher@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const driverDorjee: SessionUser = {
  id: 'usr_driver_dorjee',
  email: 'dorjee@arunachal.gov.in',
  name: 'Dorjee Khandu',
  role: 'DRIVER',
  organizationId: 'org_assam_civil_supplies',
};

const viewerAssam: SessionUser = {
  id: 'usr_viewer_assam',
  email: 'viewer@assam.gov.in',
  name: 'Dhiren Das',
  role: 'VIEWER',
  organizationId: 'org_assam_civil_supplies',
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

// Sample Test Segments (Guwahati -> Tezpur -> Tawang mountain climb)
const samplePlainsCorridor: RouteSegmentDetail[] = [
  {
    segmentOrder: 1,
    name: 'Guwahati - Jagiroad Sector',
    startPoint: { lat: 26.14, lng: 91.73 },
    endPoint: { lat: 26.12, lng: 92.21 },
    distanceKm: 54.0,
    durationMinutes: 65,
    highwayCode: 'NH-27',
    terrain: 'PLAIN',
    elevationMeters: 55,
    gradientSlopePercent: 1.2,
    roadConditionScore: 88,
  },
  {
    segmentOrder: 2,
    name: 'Jagiroad - Nagaon Bypass',
    startPoint: { lat: 26.12, lng: 92.21 },
    endPoint: { lat: 26.35, lng: 92.68 },
    distanceKm: 62.0,
    durationMinutes: 75,
    highwayCode: 'NH-27',
    terrain: 'PLAIN',
    elevationMeters: 62,
    gradientSlopePercent: 1.5,
    roadConditionScore: 85,
  },
];

const sampleMountainCutoffCorridor: RouteSegmentDetail[] = [
  {
    segmentOrder: 1,
    name: 'Bhalukpong Valley Entrance',
    startPoint: { lat: 27.01, lng: 92.64 },
    endPoint: { lat: 27.15, lng: 92.51 },
    distanceKm: 32.0,
    durationMinutes: 60,
    highwayCode: 'NH-13',
    terrain: 'HILLY',
    elevationMeters: 450,
    gradientSlopePercent: 6.5,
    roadConditionScore: 72,
  },
  {
    segmentOrder: 2,
    name: 'Sela Tunnel Cutoff Sector',
    startPoint: { lat: 27.50, lng: 92.10 }, // Near Sela Pass
    endPoint: { lat: 27.58, lng: 91.86 }, // Tawang approach
    distanceKm: 45.0,
    durationMinutes: 120,
    highwayCode: 'NH-13',
    terrain: 'MOUNTAINOUS',
    elevationMeters: 3150, // High altitude pass
    gradientSlopePercent: 14.8, // Steep slope
    roadConditionScore: 40, // Severely degraded
  },
];

describe('Phase 16: Accessibility Engine Architecture', () => {
  beforeEach(() => {
    _resetAccessibilityStore();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. ADMINISTRATIVE ACCESSIBILITY DECLARATION LIFECYCLE
  // ===========================================================================
  describe('1. Administrative Declaration Lifecycle & Geofence Boundaries', () => {
    it('creates, lists, updates, and resolves official administrative declarations', async () => {
      // 1. Create Declaration
      const declaration = await createAccessibilityDeclaration(
        {
          declarationCode: 'ASDMA-DEC-2026-08',
          settlementName: 'Haflong Hill Station Outpost',
          district: 'Dima Hasao',
          state: 'Assam',
          coordinates: { lat: 25.18, lng: 93.02 },
          previousTier: 'MEDIUM',
          newTier: 'ISOLATED',
          reason: 'Jatinga river culvert collapse severing rail and road connectivity',
          declaringAuthority: 'Assam State Disaster Management Authority (ASDMA)',
          effectiveFrom: new Date().toISOString(),
          estimatedRestoration: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
          isActive: true,
          resolvedAt: null,
          resolutionNotes: null,
          provenance: {
            sourceProvider: 'ASDMA_PORTAL',
            sourceCode: 'ASDMA',
            verifiedAt: new Date().toISOString(),
          },
        },
        dispatcherAssam.id
      );

      expect(declaration.id).toMatch(/^dec-/);
      expect(declaration.newTier).toBe('ISOLATED');
      expect(declaration.freshness).toBe('FRESH');

      // 2. Query with filter
      const list = await listAccessibilityDeclarations({ tier: 'ISOLATED', state: 'Assam' });
      expect(list.total).toBe(1);
      expect(list.declarations[0].settlementName).toBe('Haflong Hill Station Outpost');

      // 3. Resolve Declaration
      const resolved = await resolveAccessibilityDeclaration(
        declaration.id,
        'Bailey bridge erected by BRO 119 RCC; road reopened to light vehicles',
        dispatcherAssam.id
      );

      expect(resolved.isActive).toBe(false);
      expect(resolved.newTier).toBe('MEDIUM'); // Restored to previous tier
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolutionNotes).toContain('Bailey bridge erected');
    });

    it('rejects declarations reporting coordinates outside Northeast India', async () => {
      await expect(
        createAccessibilityDeclaration({
          declarationCode: 'DEL-OUT-01',
          settlementName: 'Connaught Place',
          district: 'New Delhi',
          state: 'Delhi',
          coordinates: { lat: 28.63, lng: 77.21 }, // Outside NER
          previousTier: 'HIGH',
          newTier: 'LOW',
          reason: 'Waterlogging',
          declaringAuthority: 'Delhi Traffic',
          effectiveFrom: new Date().toISOString(),
          isActive: true,
          provenance: {
            sourceProvider: 'MANUAL',
            sourceCode: 'MANUAL',
            verifiedAt: new Date().toISOString(),
          },
        })
      ).rejects.toThrow(/outside Northeast India/i);
    });
  });

  // ===========================================================================
  // 2. ZERO-FABRICATION INVARIANT: UNKNOWN ON UNOBSERVED DATA
  // ===========================================================================
  describe('2. Zero-Fabrication Invariant', () => {
    it('returns UNKNOWN with 0.0 confidence when coordinates have no observations or GIS records', async () => {
      const assessment = await assessAccessibility({
        location: {
          coordinates: { lat: 27.85, lng: 95.42 }, // Arbitrary unobserved mountain coordinate in eastern Arunachal
        },
      });

      // Under zero-fabrication invariant, unobserved coordinates must NOT invent a score
      expect(assessment.accessibilityTier).toBe('UNKNOWN');
      expect(assessment.vehicleRequirement).toBe('UNKNOWN');
      expect(assessment.confidence).toBe(0.0);
      expect(assessment.confidenceRating).toBe('UNKNOWN');
      expect(assessment.explainability.uncertaintyNote).toContain('Zero synthetic data fabricated');
      expect(assessment.warnings[0].type).toBe('STALE_INTELLIGENCE_WARNING');
    });

    it('derives verified baseline for known settlements with elevation data', async () => {
      const assessment = await assessAccessibility({
        location: {
          name: 'Guwahati Dispur Hub',
          coordinates: { lat: 26.14, lng: 91.73 },
          elevationMeters: 55, // Plains elevation
        },
      });

      expect(assessment.accessibilityTier).toBe('HIGH');
      expect(assessment.vehicleRequirement).toBe('ALL_VEHICLES');
      expect(assessment.confidence).toBe(0.85);
      expect(assessment.confidenceRating).toBe('PROBABLE');
    });
  });

  // ===========================================================================
  // 3. ROUTE CORRIDOR PASSABILITY & BOTTLENECK DETECTION
  // ===========================================================================
  describe('3. Route Corridor Passability & Ingress Profiling', () => {
    it('assesses flat plains corridor as fully passable for ALL_VEHICLES', async () => {
      const result = await assessAccessibility({
        routeSegments: samplePlainsCorridor,
      });

      expect(result.targetType).toBe('ROUTE');
      expect(result.accessibilityTier).toBe('HIGH');
      expect(result.vehicleRequirement).toBe('ALL_VEHICLES');
      expect(result.routeProfile?.isFullyPassable).toBe(true);
      expect(result.routeProfile?.bottleneckSegment).toBeNull();
      expect(result.warnings.length).toBe(0);
    });

    it('detects corridor severed when route passes through an active ISOLATED declaration', async () => {
      // Seed an active isolation order on Sela pass sector
      await createAccessibilityDeclaration(
        {
          declarationCode: 'SDMA-SELA-01',
          settlementName: 'Sela Pass Sector Outpost',
          district: 'West Kameng',
          state: 'Arunachal Pradesh',
          coordinates: { lat: 27.51, lng: 92.09 }, // Right on segment 2
          previousTier: 'LOW',
          newTier: 'ISOLATED',
          reason: 'Massive landslide blocking both highway corridors with bridge subsidence',
          declaringAuthority: 'Border Roads Organisation (BRO Project Vartak)',
          effectiveFrom: new Date().toISOString(),
          isActive: true,
          provenance: {
            sourceProvider: 'BRO_BULLETIN',
            sourceCode: 'BRO_VARTAK',
            verifiedAt: new Date().toISOString(),
          },
        },
        dispatcherAssam.id
      );

      const result = await assessAccessibility({
        routeSegments: sampleMountainCutoffCorridor,
      });

      expect(result.accessibilityTier).toBe('ISOLATED');
      expect(result.vehicleRequirement).toBe('NO_ACCESS');
      expect(result.routeProfile?.isFullyPassable).toBe(false);
      expect(result.routeProfile?.bottleneckSegment?.limitingTier).toBe('ISOLATED');
      expect(result.routeProfile?.bottleneckSegment?.reason).toContain('declared ISOLATED');

      // Emits critical warning
      const isolatedWarn = result.warnings.find((w) => w.type === 'VILLAGE_ISOLATED');
      expect(isolatedWarn).toBeDefined();
      expect(isolatedWarn?.severity).toBe('CRITICAL');
      expect(isolatedWarn?.recommendedAction).toContain('Abort routing');
    });

    it('identifies FOUR_WHEEL_DRIVE_ONLY requirement for mountain sectors without declarations', async () => {
      const result = await assessAccessibility({
        routeSegments: sampleMountainCutoffCorridor, // Has 14.8% grade, mountainous terrain
      });

      // Grade > 12% and mountainous terrain forces 4WD requirement
      expect(result.vehicleRequirement).toBe('FOUR_WHEEL_DRIVE_ONLY');

      // If vehicle is NOT 4WD, emits warning
      const vehicleNon4wdResult = await assessAccessibility({
        routeSegments: sampleMountainCutoffCorridor,
        vehicleSpecs: { is4WD: false },
      });

      const warn4wd = vehicleNon4wdResult.warnings.find((w) => w.type === 'CONVOY_ESCORT_REQUIRED');
      expect(warn4wd).toBeDefined();
      expect(warn4wd?.title).toContain('4WD Vehicle Required');
    });
  });

  // ===========================================================================
  // 4. FACILITY ACCESSIBILITY PROFILING
  // ===========================================================================
  describe('4. Facility Ingress Profiling', () => {
    it('evaluates warehouse node and confirms dock clearance and load capacity', async () => {
      const result = await assessAccessibility({
        facilityId: 'wh-01-central-guwahati',
      });

      expect(result.targetType).toBe('FACILITY');
      expect(result.accessibilityTier).toBe('HIGH');
      expect(result.facilityProfile?.dockClearanceMeters).toBe(4.5);
      expect(result.facilityProfile?.maxWeightCapacityTonnes).toBe(40);
      expect(result.confidence).toBe(0.95);
    });
  });

  // ===========================================================================
  // 5. UNCERTAINTY & STALE-DATA HANDLING
  // ===========================================================================
  describe('5. Uncertainty & Stale-Data Handling', () => {
    it('flags declaration as STALE and degrades confidence when older than 48 hours', async () => {
      const sixtyHoursAgo = new Date(Date.now() - 60 * 3600 * 1000).toISOString();

      await createAccessibilityDeclaration(
        {
          declarationCode: 'SDMA-OLD-01',
          settlementName: 'Mon Remote Post',
          district: 'Mon',
          state: 'Nagaland',
          coordinates: { lat: 26.75, lng: 95.05 },
          previousTier: 'MEDIUM',
          newTier: 'LOW',
          reason: 'Seasonal muddy track',
          declaringAuthority: 'Nagaland SDMA',
          effectiveFrom: sixtyHoursAgo, // > 48h ago
          isActive: true,
          provenance: {
            sourceProvider: 'SDMA_NAGALAND',
            sourceCode: 'NSDMA',
            verifiedAt: sixtyHoursAgo,
          },
        },
        dispatcherAssam.id
      );

      const assessment = await assessAccessibility({
        location: {
          name: 'Mon Remote Post',
          coordinates: { lat: 26.75, lng: 95.05 },
        },
      });

      expect(assessment.isStale).toBe(true);
      expect(assessment.freshness).toBe('STALE');
      expect(assessment.confidence).toBe(0.70); // Degraded from 0.95

      const staleWarn = assessment.warnings.find((w) => w.type === 'STALE_INTELLIGENCE_WARNING');
      expect(staleWarn).toBeDefined();
      expect(staleWarn?.message).toContain('warrants field re-verification');
    });
  });

  // ===========================================================================
  // 6. REST API ENDPOINTS & RBAC CAPABILITY GATING
  // ===========================================================================
  describe('6. REST API Endpoints & RBAC Authorization', () => {
    it('POST /api/v1/accessibility/assess allows authenticated users (DRIVER, VIEWER, DISPATCHER)', async () => {
      const req = createMockRequest('POST', '/api/v1/accessibility/assess', driverDorjee, {
        route_segments: samplePlainsCorridor,
      });

      const res = await postAssessRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.accessibilityTier).toBe('HIGH');
    });

    it('POST /api/v1/accessibility/assess denies unauthenticated requests (401)', async () => {
      const req = createMockRequest('POST', '/api/v1/accessibility/assess', undefined, {
        route_segments: samplePlainsCorridor,
      });

      const res = await postAssessRoute(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/accessibility/declarations allows VIEWER to read declarations', async () => {
      const req = createMockRequest('GET', '/api/v1/accessibility/declarations', viewerAssam);
      const res = await getDeclarationsRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.declarations).toBeDefined();
    });

    it('POST /api/v1/accessibility/declarations denies VIEWER (403), allows DISPATCHER (201)', async () => {
      const payload = {
        declaration_code: 'DEC-ROUT-01',
        settlement_name: 'Anini Remote Valley',
        district: 'Dibang Valley',
        state: 'Arunachal Pradesh',
        latitude: 28.79,
        longitude: 95.9,
        previous_tier: 'MEDIUM',
        new_tier: 'ISOLATED',
        reason: 'Sikang river bridge damaged',
        declaring_authority: 'PWD Highway Div',
      };

      // Denied for VIEWER
      const viewerReq = createMockRequest('POST', '/api/v1/accessibility/declarations', viewerAssam, payload);
      const viewerRes = await postDeclarationsRoute(viewerReq);
      expect(viewerRes.status).toBe(403);

      // Allowed for DISPATCHER
      const dispReq = createMockRequest('POST', '/api/v1/accessibility/declarations', dispatcherAssam, payload);
      const dispRes = await postDeclarationsRoute(dispReq);
      expect(dispRes.status).toBe(201);
    });

    it('PATCH /api/v1/accessibility/declarations/[id] resolves declaration for DISPATCHER', async () => {
      const dec = await createAccessibilityDeclaration(
        {
          declarationCode: 'DEC-PATCH-01',
          settlementName: 'Phek Foothills',
          district: 'Phek',
          state: 'Nagaland',
          coordinates: { lat: 25.68, lng: 94.48 },
          previousTier: 'MEDIUM',
          newTier: 'LOW',
          reason: 'Landslide clearance underway',
          declaringAuthority: 'PWD Nagaland',
          effectiveFrom: new Date().toISOString(),
          isActive: true,
          provenance: {
            sourceProvider: 'PWD',
            sourceCode: 'PWD_NL',
            verifiedAt: new Date().toISOString(),
          },
        },
        dispatcherAssam.id
      );

      const patchReq = createMockRequest('PATCH', `/api/v1/accessibility/declarations/${dec.id}`, dispatcherAssam, {
        is_active: false,
        resolution_notes: 'Corridor officially restored to normal traffic',
      });

      const patchRes = await patchDeclarationItemRoute(patchReq, { params: { id: dec.id } });
      expect(patchRes.status).toBe(200);

      const body = await patchRes.json();
      expect(body.data.isActive).toBe(false);
      expect(body.data.newTier).toBe('MEDIUM');
    });
  });

  // ===========================================================================
  // 7. BACKWARD COMPATIBILITY
  // ===========================================================================
  describe('7. Backward Compatibility (Legacy getAccessibility)', () => {
    it('preserves existing legacy getAccessibility engine function for existing UI pages', () => {
      const result = getAccessibility('LOC001'); // Guwahati
      expect(result).toBeDefined();
      expect(result?.overall).toBeDefined();
      expect(result?.classification).toBeDefined();
    });
  });
});
