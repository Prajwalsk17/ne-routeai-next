/**
 * AuraNER / NER-Route AI — Phase 15: Production Risk Engine Test Suite
 * 
 * Verifies the production risk engine architecture:
 * 1. APIs provide facts (observed factual inputs, zero fabrication)
 * 2. Algorithms calculate (deterministic multi-factor formula, weights sum to 1.0)
 * 3. AI reasons (contextual narrative advisory without hallucinating facts)
 * 4. Backend enforces (policy gating: requiresRecalculation, alerts integration)
 * 5. Humans approve critical decisions (mandatory human confirmation on critical actions)
 * 6. Tripartite separation: observedData vs calculatedRisk vs aiInterpretation
 * 7. Explainability & Factor Attribution
 * 8. Situational Risk Events Registry & NER Geofence Boundary Validation
 * 9. REST API Contracts & RBAC Enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { RouteSegmentDetail, Coordinates } from '@/lib/providers/types';
import { WeatherEvent, RoadEvent } from '@/lib/types/ingestion';
import {
  calculateProductionRisk,
  assessRouteRisk,
  createRiskEvent,
  listRiskEvents,
  getRiskEventById,
  updateRiskEvent,
  resolveRiskEvent,
  _resetRiskStore,
} from '@/lib/services/risk.service';
import { POST as postCalculateRoute } from '@/app/api/v1/risk/calculate/route';
import { GET as getRiskEventsRoute, POST as postRiskEventsRoute } from '@/app/api/v1/risk/events/route';
import { GET as getRiskEventItemRoute, PATCH as patchRiskEventItemRoute } from '@/app/api/v1/risk/events/[id]/route';

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

// Sample Northeast India Corridors & Test Segments
const samplePlainsSegments: RouteSegmentDetail[] = [
  {
    segmentOrder: 1,
    name: 'Guwahati Bypass Segment',
    startPoint: { lat: 26.1445, lng: 91.7362 }, // Guwahati
    endPoint: { lat: 26.185, lng: 91.815 },
    distanceKm: 12.5,
    durationMinutes: 18,
    highwayCode: 'NH-27',
    terrain: 'PLAIN',
    elevationMeters: 55,
    gradientSlopePercent: 1.5,
    roadConditionScore: 92,
  },
  {
    segmentOrder: 2,
    name: 'Dispur Corridor Segment',
    startPoint: { lat: 26.185, lng: 91.815 },
    endPoint: { lat: 26.25, lng: 91.95 },
    distanceKm: 18.0,
    durationMinutes: 24,
    highwayCode: 'NH-27',
    terrain: 'PLAIN',
    elevationMeters: 65,
    gradientSlopePercent: 2.0,
    roadConditionScore: 88,
  },
];

const sampleMountainPassSegments: RouteSegmentDetail[] = [
  {
    segmentOrder: 1,
    name: 'Dimapur Zubza Approach',
    startPoint: { lat: 25.71, lng: 93.8 }, // Dimapur approach
    endPoint: { lat: 25.718, lng: 94.026 }, // Zubza mountain pass
    distanceKm: 24.5,
    durationMinutes: 55,
    highwayCode: 'NH-29',
    terrain: 'MOUNTAINOUS',
    elevationMeters: 1450,
    gradientSlopePercent: 13.5,
    roadConditionScore: 58,
  },
  {
    segmentOrder: 2,
    name: 'Kohima Summit Climb',
    startPoint: { lat: 25.718, lng: 94.026 },
    endPoint: { lat: 25.6751, lng: 94.1086 }, // Kohima summit
    distanceKm: 15.2,
    durationMinutes: 45,
    highwayCode: 'NH-29',
    terrain: 'MOUNTAINOUS',
    elevationMeters: 1850,
    gradientSlopePercent: 16.2, // Very steep grade
    roadConditionScore: 50,
  },
];

describe('Phase 15: Production Risk Engine Architecture', () => {
  beforeEach(() => {
    _resetRiskStore();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. DETERMINISTIC ALGORITHMIC RISK CALCULATION & WEIGHT BALANCING
  // ===========================================================================
  describe('1. Deterministic Mathematical Formula & Weight Balancing', () => {
    it('verifies that configured mathematical weights strictly sum to 1.0', async () => {
      const result = await calculateProductionRisk({
        routeSegments: samplePlainsSegments,
      });

      const { infrastructure, meteorological, topographical, telemetry } = result.weights;
      const sum = infrastructure + meteorological + topographical + telemetry;
      expect(parseFloat(sum.toFixed(4))).toBe(1.0);
    });

    it('calculates low nominal risk for dry weather and flat highway segments', async () => {
      const result = await calculateProductionRisk({
        routeSegments: samplePlainsSegments,
        weatherEvents: [
          {
            id: 'wea-dry-01',
            dataSourceId: 'src-imd',
            sourceRecordId: 'AWS_GAU',
            stationCode: 'AWS_GAU',
            stationName: 'Guwahati AWS',
            state: 'Assam',
            coordinates: { lat: 26.14, lng: 91.73 },
            temperatureC: 28.0,
            rainfallMm1h: 0,
            rainfallMm24h: 0,
            windSpeedKmh: 10,
            visibilityKm: 10,
            conditionCode: 'CLEAR',
            isSevereWarning: false,
            observedAt: new Date().toISOString(),
            ingestedAt: new Date().toISOString(),
            freshness: 'FRESH',
            provenance: {
              sourceCode: 'IMD_AWS',
              sourceName: 'India Meteorological Dept',
              sourceRecordId: 'AWS_GAU',
              ingestionRunId: 'run-test',
              rawPayloadHash: 'hash-test',
              ingestedAt: new Date().toISOString(),
            },
          },
        ],
      });

      expect(result.compositeScore).toBeLessThan(0.25);
      expect(result.displayScore).toBeLessThan(25);
      expect(result.severity).toBe('LOW');
      expect(result.requiresRecalculation).toBe(false);
      expect(result.requiresHumanApproval).toBe(false);
    });

    it('monotonically increases composite score with severe rainfall and wind', async () => {
      const dryResult = await calculateProductionRisk({
        routeSegments: samplePlainsSegments,
      });

      const torrentialRainWeather: WeatherEvent = {
        id: 'wea-severe-01',
        dataSourceId: 'src-imd',
        sourceRecordId: 'AWS_CHERRA',
        stationCode: 'AWS_CHERRA',
        stationName: 'Sohra Cherrapunji AWS',
        state: 'Meghalaya',
        coordinates: { lat: 25.27, lng: 91.73 },
        temperatureC: 18.0,
        rainfallMm1h: 65.0, // Torrential downpour > 50mm/h
        rainfallMm24h: 310.0,
        windSpeedKmh: 55.0,
        visibilityKm: 0.8,
        conditionCode: 'HEAVY_RAIN',
        isSevereWarning: true,
        observedAt: new Date().toISOString(),
        ingestedAt: new Date().toISOString(),
        freshness: 'FRESH',
        provenance: {
          sourceCode: 'IMD_AWS',
          sourceName: 'IMD',
          sourceRecordId: 'AWS_CHERRA',
          ingestionRunId: 'run-1',
          rawPayloadHash: 'hash-1',
          ingestedAt: new Date().toISOString(),
        },
      };

      const stormyResult = await calculateProductionRisk({
        routeSegments: samplePlainsSegments,
        weatherEvents: [torrentialRainWeather],
      });

      expect(stormyResult.compositeScore).toBeGreaterThan(dryResult.compositeScore);
      expect(stormyResult.subIndices.meteorological).toBeGreaterThanOrEqual(0.85);
      expect(stormyResult.factors.find((f) => f.id === 'RF_METEOROLOGICAL_INTENSITY')?.thresholdTriggered).toBe(true);
    });
  });

  // ===========================================================================
  // 2. ZERO-FABRICATION INVARIANT & CONFIDENCE DEGRADATION
  // ===========================================================================
  describe('2. Zero-Fabrication Invariant & Confidence Tracking', () => {
    it('does NOT invent synthetic rainfall or wind when meteorological telemetry is unobserved', async () => {
      const resultWithoutWeather = await calculateProductionRisk({
        routeSegments: samplePlainsSegments,
        weatherEvents: [], // No weather reports available
      });

      // Observed facts must report 0 / nominal, NOT fabricated values
      expect(resultWithoutWeather.observedData.reportedPrecipitationMaxMm1h).toBe(0);
      expect(resultWithoutWeather.observedData.activeWeatherReadingsCount).toBe(0);

      // Source confidence degrades to reflect unobserved weather state
      const meteoFactor = resultWithoutWeather.factors.find((f) => f.id === 'RF_METEOROLOGICAL_INTENSITY');
      expect(meteoFactor?.confidence).toBe(0.70); // Lowered confidence due to missing local AWS
      expect(resultWithoutWeather.confidence).toBeLessThan(1.0);
    });

    it('derives high confidence when corroborated by authoritative sources', async () => {
      const result = await calculateProductionRisk({
        routeSegments: sampleMountainPassSegments,
        weatherEvents: [
          {
            id: 'wea-1',
            dataSourceId: 'src-1',
            sourceRecordId: 'AWS_KOH',
            stationCode: 'AWS_KOH',
            stationName: 'Kohima AWS',
            state: 'Nagaland',
            coordinates: { lat: 25.67, lng: 94.1 },
            temperatureC: 19,
            rainfallMm1h: 5,
            rainfallMm24h: 12,
            windSpeedKmh: 14,
            visibilityKm: 8,
            conditionCode: 'PARTLY_CLOUDY',
            isSevereWarning: false,
            observedAt: new Date().toISOString(),
            ingestedAt: new Date().toISOString(),
            freshness: 'FRESH',
            provenance: {
              sourceCode: 'IMD_AWS',
              sourceName: 'IMD',
              sourceRecordId: 'AWS_KOH',
              ingestionRunId: 'run-1',
              rawPayloadHash: 'hash-1',
              ingestedAt: new Date().toISOString(),
            },
          },
        ],
        roadEvents: [
          {
            id: 'road-1',
            dataSourceId: 'src-bro',
            sourceRecordId: 'BRO_NH29_ZUBZA',
            highwayCode: 'NH-29',
            sectorName: 'Zubza Pass',
            state: 'Nagaland',
            coordinates: { lat: 25.718, lng: 94.026 },
            blockageType: 'SINGLE_LANE_OPEN',
            reason: 'ROCKFALL',
            clearanceEta: null,
            isImpassable: false,
            verifiedByBro: true,
            reportedAt: new Date().toISOString(),
            ingestedAt: new Date().toISOString(),
            freshness: 'FRESH',
            provenance: {
              sourceCode: 'BRO_ROAD_BULLETINS',
              sourceName: 'Border Roads Organisation',
              sourceRecordId: 'BRO_NH29_ZUBZA',
              ingestionRunId: 'run-bro-1',
              rawPayloadHash: 'hash-bro-1',
              ingestedAt: new Date().toISOString(),
            },
          },
        ],
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
      expect(result.observedData.observationSources).toContain('IMD_AWS');
      expect(result.observedData.observationSources).toContain('BRO_ROAD_BULLETINS');
    });
  });

  // ===========================================================================
  // 3. TRIPARTITE SEPARATION: FACTS vs ALGORITHM vs AI INTERPRETATION
  // ===========================================================================
  describe('3. Tripartite Architectural Separation', () => {
    it('strictly isolates observed facts, algorithmic calculations, and semantic AI reasoning', async () => {
      const result = await calculateProductionRisk({
        routeSegments: sampleMountainPassSegments,
        telemetry: {
          speedKmh: 32,
          speedVariance: -8,
          gpsMultipathJitterMeters: 12,
          deadReckoningDurationSeconds: 45,
        },
        vehicleSpecs: {
          maxGradientPercent: 15,
          grossWeightTonnes: 12,
        },
      });

      // 1. Observed facts contain raw measurements without calculated scores
      expect(result.observedData.totalSegmentsEvaluated).toBe(2);
      expect(result.observedData.maxGradientPercent).toBe(16.2);
      expect(result.observedData.maxElevationMeters).toBe(1850);
      expect(result.observedData.telemetryFacts?.speedKmh).toBe(32);

      // 2. Calculated risk contains mathematical numbers and applied weights
      expect(typeof result.compositeScore).toBe('number');
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(1.0);
      expect(result.subIndices.topographical).toBeGreaterThan(0.5);

      // 3. AI interpretation provides narrative advisory based on factual inputs
      expect(result.aiInterpretation).toBeDefined();
      expect(result.aiInterpretation?.summary).toContain('/100');
      expect(result.aiInterpretation?.terrainContext).toContain('Steep mountain pass');
      expect(result.aiInterpretation?.confidenceReasoning).toContain('Zero synthetic facts');
    });
  });

  // ===========================================================================
  // 4. BACKEND ENFORCEMENT & HUMAN APPROVAL FOR CRITICAL DECISIONS
  // ===========================================================================
  describe('4. Backend Policy Enforcement & Human Approval Gate', () => {
    it('enforces requiresRecalculation=true and requiresHumanApproval=true on total road blockage', async () => {
      const roadBlockage: RoadEvent = {
        id: 'road-block-01',
        dataSourceId: 'src-bro',
        sourceRecordId: 'BRO_NH29_BLK',
        highwayCode: 'NH-29',
        sectorName: 'Zubza Mountain Pass (Km 142)',
        state: 'Nagaland',
        coordinates: { lat: 25.718, lng: 94.026 },
        blockageType: 'BOTH_LANES_BLOCKED',
        reason: 'LANDSLIDE',
        clearanceEta: null,
        isImpassable: true,
        verifiedByBro: true,
        reportedAt: new Date().toISOString(),
        ingestedAt: new Date().toISOString(),
        freshness: 'FRESH',
        provenance: {
          sourceCode: 'BRO_ROAD_BULLETINS',
          sourceName: 'BRO',
          sourceRecordId: 'BRO_NH29_BLK',
          ingestionRunId: 'run-bro',
          rawPayloadHash: 'hash-bro',
          ingestedAt: new Date().toISOString(),
        },
      };

      const result = await calculateProductionRisk({
        routeSegments: sampleMountainPassSegments,
        roadEvents: [roadBlockage],
        vehicleLocation: { lat: 25.71, lng: 93.9 },
      });

      // Backend enforces policy
      expect(result.severity).toBe('CRITICAL');
      expect(result.requiresRecalculation).toBe(true);

      // Humans approve critical decisions
      expect(result.requiresHumanApproval).toBe(true);

      // Hazard warning details
      expect(result.hazardWarnings.length).toBeGreaterThan(0);
      expect(result.hazardWarnings[0].isDirectBlockage).toBe(true);
      expect(result.hazardWarnings[0].recommendedAction).toBe('RECALCULATE_ROUTE');
    });

    it('flags critical exceedance when road gradient exceeds physical vehicle hill-climbing spec', async () => {
      const lowPowerVehicleSpecs = {
        maxGradientPercent: 12.0, // Can only climb up to 12% slope
        grossWeightTonnes: 16.0,
      };

      const result = await calculateProductionRisk({
        routeSegments: sampleMountainPassSegments, // Has 16.2% gradient segment
        vehicleSpecs: lowPowerVehicleSpecs,
      });

      const topoFactor = result.factors.find((f) => f.id === 'RF_TOPOGRAPHICAL_GRADIENT');
      expect(topoFactor?.thresholdTriggered).toBe(true);
      expect(topoFactor?.calculationExplanation).toContain('CRITICAL EXCEEDANCE');
      expect(topoFactor?.calculatedScore).toBeGreaterThanOrEqual(0.70);
    });
  });

  // ===========================================================================
  // 5. EXPLAINABILITY & FACTOR ATTRIBUTION
  // ===========================================================================
  describe('5. Explainability & Factor Attribution Decomposition', () => {
    it('breaks down overall composite risk into transparent percentage contributions', async () => {
      const result = await calculateProductionRisk({
        routeSegments: sampleMountainPassSegments,
      });

      expect(result.explainability.formula).toContain('CompositeRisk =');
      expect(result.explainability.primaryDriver).toBeDefined();
      expect(result.explainability.factorAttribution.length).toBe(4);

      // Sum of percentage contributions approximates 100%
      const totalPct = result.explainability.factorAttribution.reduce((acc, f) => acc + f.contributionPercent, 0);
      expect(totalPct).toBeGreaterThanOrEqual(95);
      expect(totalPct).toBeLessThanOrEqual(105);
    });
  });

  // ===========================================================================
  // 6. SITUATIONAL RISK EVENTS REGISTRY & NER BOUNDS VALIDATION
  // ===========================================================================
  describe('6. Situational Risk Events Registry & Boundary Validation', () => {
    it('creates, lists, and resolves active situational risk events with auditability', async () => {
      // 1. Create risk event
      const event = await createRiskEvent(
        {
          eventCode: 'RSK-LANDSLIDE-001',
          category: 'LANDSLIDE',
          severity: 'HIGH',
          status: 'ACTIVE',
          title: 'Active Rockslide on NH-6 Jowai Route',
          description: 'Boulder fall cleared partially; heavy delays ongoing.',
          coordinates: { lat: 25.45, lng: 92.2 }, // Meghalaya
          affectedRadiusMeters: 2500,
          affectedCorridors: ['NH-6'],
          state: 'Meghalaya',
          confidence: 0.90,
          reportedAt: new Date().toISOString(),
          provenance: {
            sourceProvider: 'POLICE_TRAFFIC_BRANCH',
            sourceCode: 'MEGHALAYA_POLICE',
          },
        },
        dispatcherAssam.id
      );

      expect(event.id).toMatch(/^rsk-/);
      expect(event.status).toBe('ACTIVE');

      // 2. List with filter
      const list = await listRiskEvents({ corridor: 'NH-6' });
      expect(list.total).toBe(1);
      expect(list.events[0].eventCode).toBe('RSK-LANDSLIDE-001');

      // 3. Resolve event
      const resolved = await resolveRiskEvent(event.id, 'Debris cleared by PWD team', dispatcherAssam.id);
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('rejects situational risk events located outside Northeast India bounding coordinates', async () => {
      await expect(
        createRiskEvent({
          eventCode: 'RSK-MUMBAI-001',
          category: 'FLASH_FLOOD',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          title: 'Marine Drive Coastal Surge',
          description: 'Mumbai sea wall breach',
          coordinates: { lat: 18.94, lng: 72.82 }, // Far outside NER (88.0E - 97.5E)
          affectedRadiusMeters: 1000,
          affectedCorridors: ['WESTERN_EXPRESS'],
          state: 'Maharashtra',
          confidence: 0.95,
          reportedAt: new Date().toISOString(),
          provenance: {},
        })
      ).rejects.toThrow(/outside Northeast India/i);
    });
  });

  // ===========================================================================
  // 7. REST API ENDPOINTS & RBAC CAPABILITY GATING
  // ===========================================================================
  describe('7. REST API Endpoints & RBAC Authorization', () => {
    it('POST /api/v1/risk/calculate allows DISPATCHER and DRIVER to compute risk', async () => {
      const req = createMockRequest('POST', '/api/v1/risk/calculate', dispatcherAssam, {
        route_segments: samplePlainsSegments,
      });

      const res = await postCalculateRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.compositeScore).toBeDefined();
      expect(body.data.explainability).toBeDefined();
    });

    it('POST /api/v1/risk/calculate denies unauthenticated requests (401)', async () => {
      const req = createMockRequest('POST', '/api/v1/risk/calculate', undefined, {
        route_segments: samplePlainsSegments,
      });

      const res = await postCalculateRoute(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/risk/calculate denies VIEWER from running calculation (403)', async () => {
      const req = createMockRequest('POST', '/api/v1/risk/calculate', viewerAssam, {
        route_segments: samplePlainsSegments,
      });

      const res = await postCalculateRoute(req);
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/risk/events allows VIEWER to read active hazards (200)', async () => {
      const req = createMockRequest('GET', '/api/v1/risk/events?state=Assam', viewerAssam);
      const res = await getRiskEventsRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.events).toBeDefined();
    });

    it('POST /api/v1/risk/events allows SUPER_ADMIN to register hazard, denies VIEWER', async () => {
      const eventPayload = {
        event_code: 'RSK-SEV-01',
        category: 'ROCKFALL',
        severity: 'HIGH',
        title: 'Sevoke Kalimpong Rockslide',
        description: 'Boulders on NH-10',
        latitude: 26.9,
        longitude: 88.48, // Sikkim border
        affected_corridors: ['NH-10'],
        state: 'Sikkim',
        confidence: 0.9,
      };

      // Denied for VIEWER
      const viewerReq = createMockRequest('POST', '/api/v1/risk/events', viewerAssam, eventPayload);
      const viewerRes = await postRiskEventsRoute(viewerReq);
      expect(viewerRes.status).toBe(403);

      // Allowed for SUPER_ADMIN
      const adminReq = createMockRequest('POST', '/api/v1/risk/events', superAdmin, eventPayload);
      const adminRes = await postRiskEventsRoute(adminReq);
      expect(adminRes.status).toBe(201);
    });

    it('PATCH /api/v1/risk/events/[id] resolves risk event for DISPATCHER', async () => {
      const event = await createRiskEvent(
        {
          eventCode: 'RSK-PATCH-01',
          category: 'FLASH_FLOOD',
          severity: 'MEDIUM',
          status: 'ACTIVE',
          title: 'Kaziranga Highway Waterlogging',
          description: 'Water receding on NH-715',
          coordinates: { lat: 26.58, lng: 93.17 },
          affectedRadiusMeters: 500,
          affectedCorridors: ['NH-715'],
          state: 'Assam',
          confidence: 0.85,
          reportedAt: new Date().toISOString(),
          provenance: {},
        },
        dispatcherAssam.id
      );

      const patchReq = createMockRequest('PATCH', `/api/v1/risk/events/${event.id}`, dispatcherAssam, {
        status: 'RESOLVED',
        description: 'Road fully drained and reopened by transport dept',
      });

      const patchRes = await patchRiskEventItemRoute(patchReq, { params: { id: event.id } });
      expect(patchRes.status).toBe(200);

      const body = await patchRes.json();
      expect(body.data.status).toBe('RESOLVED');
    });
  });

  // ===========================================================================
  // 8. BACKWARD COMPATIBILITY VERIFICATION
  // ===========================================================================
  describe('8. Backward Compatibility (assessRouteRisk)', () => {
    it('preserves existing assessRouteRisk function for scenario.ts and regression tests', () => {
      const assessment = assessRouteRisk(
        samplePlainsSegments,
        { lat: 26.14, lng: 91.73 },
        [],
        []
      );

      expect(assessment.compositeRiskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.compositeRiskScore).toBeLessThanOrEqual(100);
      expect(assessment.overallSeverity).toBe('LOW');
      expect(assessment.requiresRecalculation).toBe(false);
      expect(assessment.assessmentSummary).toBeDefined();
    });
  });
});
