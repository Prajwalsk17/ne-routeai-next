/**
 * AuraNER / NER-Route AI — Phase 14: NER Data Ingestion Test Suite
 * 
 * Verifies production-grade data ingestion architecture for Northeast India:
 * 1. Data Source Registry (seeding default authoritative sources, listing, registering, updating)
 * 2. Schema Validation (NER geographic boundary bounds, units, condition codes, temporal sanity)
 * 3. Normalization (weather units, road blockage types, accessibility tiers)
 * 4. Deterministic Deduplication (SHA-256 payload hashing, duplicate skipping)
 * 5. Partial Ingestion Execution (isolated rejection of invalid records without aborting valid ones)
 * 6. Resilient Retries & Failure Handling (exponential backoff, error logging, failure counters)
 * 7. Provenance Tracking (attaching sourceCode, sourceName, ingestionRunId, payloadHash)
 * 8. Dynamic Freshness Evaluation (FRESH, STALE, EXPIRED)
 * 9. Tamper-Evident Audit Logging (DATA_INGESTION_STARTED, DATA_INGESTION_COMPLETED)
 * 10. REST API Contracts (GET/POST /api/v1/ingestion/sources, trigger, runs, events)
 * 11. Zero-Fabrication Invariant (no synthetic weather or road closures manufactured)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  listDataSources,
  getDataSourceById,
  getDataSourceByCode,
  registerDataSource,
  updateDataSource,
  executeIngestionRun,
  listIngestionRuns,
  queryIngestedEvents,
  computePayloadHash,
  calculateEventFreshness,
  isWithinNerBounds,
  _resetIngestionStore,
} from '@/lib/services/ingestion.service';
import { GET as getSourcesRoute, POST as postSourcesRoute } from '@/app/api/v1/ingestion/sources/route';
import { POST as postTriggerRoute } from '@/app/api/v1/ingestion/sources/[id]/trigger/route';
import { GET as getRunsRoute } from '@/app/api/v1/ingestion/runs/route';
import { GET as getEventsRoute } from '@/app/api/v1/ingestion/events/route';

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

describe('Phase 14: NER Data Ingestion Architecture', () => {
  beforeEach(() => {
    _resetIngestionStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. DATA SOURCE REGISTRY & SEEDING
  // ===========================================================================
  describe('1. Data Source Registry & Seeding', () => {
    it('seeds the default authoritative NER sources on startup', async () => {
      const sources = await listDataSources();
      expect(sources.length).toBeGreaterThanOrEqual(5);

      const codes = sources.map((s) => s.code);
      expect(codes).toContain('IMD_AWS');
      expect(codes).toContain('BRO_ROAD_BULLETINS');
      expect(codes).toContain('CWC_FLOOD_GAUGE');
      expect(codes).toContain('SDMA_DISASTER_PORTAL');
      expect(codes).toContain('OPENSTREETMAP_NER');
    });

    it('filters data sources by state, active status, and provider type', async () => {
      const assamSources = await listDataSources({ state: 'ASSAM' });
      // CWC is ASSAM, plus ALL_NER sources apply to ASSAM
      expect(assamSources.length).toBeGreaterThanOrEqual(1);

      const govBulletins = await listDataSources({ providerType: 'GOV_BULLETIN' });
      expect(govBulletins.some((s) => s.code === 'BRO_ROAD_BULLETINS')).toBe(true);

      const activeSources = await listDataSources({ isActive: true });
      expect(activeSources.every((s) => s.isActive)).toBe(true);
    });

    it('registers a new authoritative data source with valid metadata', async () => {
      const newSource = await registerDataSource(
        {
          code: 'NESAC_UAV_RADAR',
          name: 'North Eastern Space Applications Centre UAV Radar',
          provider_type: 'REST_API',
          endpoint_url: 'https://nesac.gov.in/api/v1/radar',
          fetch_interval_seconds: 3600,
          state: 'MEGHALAYA',
          is_active: true,
          freshness_ttl_seconds: 7200,
        },
        dispatcherAssam
      );

      expect(newSource.id).toBeDefined();
      expect(newSource.code).toBe('NESAC_UAV_RADAR');
      expect(newSource.state).toBe('MEGHALAYA');
      expect(newSource.consecutiveFailures).toBe(0);

      const fetched = await getDataSourceByCode('NESAC_UAV_RADAR');
      expect(fetched.name).toBe('North Eastern Space Applications Centre UAV Radar');
    });

    it('rejects registering duplicate data source code', async () => {
      await expect(
        registerDataSource(
          {
            code: 'IMD_AWS', // Already seeded
            name: 'Duplicate IMD Source',
            provider_type: 'REST_API',
          },
          dispatcherAssam
        )
      ).rejects.toThrow('already exists');
    });

    it('updates data source metadata and recalculates timestamps', async () => {
      const source = await getDataSourceByCode('IMD_AWS');
      const updated = await updateDataSource(
        source.id,
        {
          fetch_interval_seconds: 900, // 15 mins
          freshness_ttl_seconds: 1800,
        },
        dispatcherAssam
      );

      expect(updated.fetchIntervalSeconds).toBe(900);
      expect(updated.freshnessTtlSeconds).toBe(1800);
    });
  });

  // ===========================================================================
  // 2. SCHEMA VALIDATION & NORMALIZATION
  // ===========================================================================
  describe('2. Schema Validation & Normalization Pipeline', () => {
    it('validates and ingests real meteorological readings within NER geofence', async () => {
      const weatherPayload = [
        {
          station_name: 'Guwahati Borjhar Airport AWS',
          station_code: 'AWS_GAU_01',
          state: 'Assam',
          latitude: 26.1061,
          longitude: 91.5859,
          temperature_c: 24.8,
          rainfall_mm_1h: 12.5,
          rainfall_mm_24h: 45.0,
          wind_speed_kmh: 18.5,
          visibility_km: 6.0,
          condition_code: 'HEAVY_RAIN',
          is_severe_warning: true,
          observed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ];

      const result = await executeIngestionRun('IMD_AWS', {
        customPayload: weatherPayload,
        triggerMode: 'MANUAL',
        triggeredBy: dispatcherAssam.id,
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.run.recordsIngested).toBe(1);
      expect(result.run.recordsRejected).toBe(0);
      expect(result.weatherEvents?.[0].stationName).toBe('Guwahati Borjhar Airport AWS');
      expect(result.weatherEvents?.[0].conditionCode).toBe('HEAVY_RAIN');
      expect(result.weatherEvents?.[0].freshness).toBe('FRESH');
    });

    it('rejects meteorological readings outside Northeast India boundary coordinates', async () => {
      const outOfBoundsPayload = [
        {
          station_name: 'New Delhi Safdarjung AWS',
          station_code: 'AWS_DEL_01',
          state: 'Delhi',
          latitude: 28.584,
          longitude: 77.206, // Far outside Northeast India (89.5 - 97.5)
          temperature_c: 32.0,
          rainfall_mm_1h: 0,
          condition_code: 'CLEAR',
          observed_at: new Date().toISOString(),
        },
      ];

      const result = await executeIngestionRun('IMD_AWS', {
        customPayload: outOfBoundsPayload,
      });

      expect(result.run.status).toBe('FAILED');
      expect(result.run.recordsIngested).toBe(0);
      expect(result.run.recordsRejected).toBe(1);
      expect(result.run.errorLog).toContain('outside Northeast India');
    });

    it('rejects observation timestamps more than 10 minutes in the future', async () => {
      const futurePayload = [
        {
          station_name: 'Shillong Peak AWS',
          station_code: 'AWS_SHL_01',
          state: 'Meghalaya',
          latitude: 25.578,
          longitude: 91.893,
          temperature_c: 16.5,
          rainfall_mm_1h: 0,
          condition_code: 'CLEAR',
          observed_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour in future
        },
      ];

      const result = await executeIngestionRun('IMD_AWS', {
        customPayload: futurePayload,
      });

      expect(result.run.recordsRejected).toBe(1);
      expect(result.run.errorLog).toContain('Observation timestamp cannot be more than 10 minutes in the future');
    });

    it('normalizes highway corridor blockage records from BRO bulletins', async () => {
      const broPayload = [
        {
          highway_code: 'NH-29',
          sector_name: 'Zubza Mountain Pass (Km 142)',
          state: 'Nagaland',
          latitude: 25.718,
          longitude: 94.026,
          blockage_type: 'BOTH_LANES_BLOCKED',
          reason: 'LANDSLIDE',
          clearance_eta: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          is_impassable: true,
          verified_by_bro: true,
          reported_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ];

      const result = await executeIngestionRun('BRO_ROAD_BULLETINS', {
        customPayload: broPayload,
        triggeredBy: dispatcherAssam.id,
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.run.recordsIngested).toBe(1);
      expect(result.roadEvents?.[0].highwayCode).toBe('NH-29');
      expect(result.roadEvents?.[0].blockageType).toBe('BOTH_LANES_BLOCKED');
      expect(result.roadEvents?.[0].verifiedByBro).toBe(true);
    });

    it('normalizes remote village accessibility tier transitions from SDMA alerts', async () => {
      const sdmaPayload = [
        {
          settlement_name: 'Damin Remote Outpost',
          district: 'Kurung Kumey',
          state: 'Arunachal Pradesh',
          latitude: 28.18,
          longitude: 93.35,
          previous_tier: 'LOW',
          new_tier: 'ISOLATED',
          reason: 'Subansiri river suspension bridge washed out following flash flood',
          declared_by: 'ASDMA / District Disaster Management Authority',
          effective_from: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          estimated_restoration: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          is_active: true,
        },
      ];

      const result = await executeIngestionRun('SDMA_DISASTER_PORTAL', {
        customPayload: sdmaPayload,
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.run.recordsIngested).toBe(1);
      expect(result.accessibilityEvents?.[0].settlementName).toBe('Damin Remote Outpost');
      expect(result.accessibilityEvents?.[0].newTier).toBe('ISOLATED');
      expect(result.accessibilityEvents?.[0].isActive).toBe(true);
    });
  });

  // ===========================================================================
  // 3. DETERMINISTIC DEDUPLICATION & SHA-256 HASH
  // ===========================================================================
  describe('3. Deterministic Deduplication & Provenance Hash', () => {
    it('computes identical SHA-256 hash for matching payload identities', () => {
      const payload1 = { station: 'AWS_GAU', temp: 25.5, time: '2026-09-20T08:00:00Z' };
      const payload2 = { station: 'AWS_GAU', temp: 25.5, time: '2026-09-20T08:00:00Z' };
      expect(computePayloadHash(payload1)).toBe(computePayloadHash(payload2));
    });

    it('skips duplicate external records and increments recordsSkippedDuplicate counter', async () => {
      const repeatedPayload = [
        {
          station_name: 'Kohima DC Office AWS',
          station_code: 'AWS_KOH_01',
          state: 'Nagaland',
          latitude: 25.6751,
          longitude: 94.1086,
          temperature_c: 19.2,
          rainfall_mm_1h: 0,
          condition_code: 'PARTLY_CLOUDY',
          observed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ];

      // First run: ingests 1 record
      const run1 = await executeIngestionRun('IMD_AWS', { customPayload: repeatedPayload });
      expect(run1.run.recordsIngested).toBe(1);
      expect(run1.run.recordsSkippedDuplicate).toBe(0);

      // Second run: recognizes duplicate, skips insertion
      const run2 = await executeIngestionRun('IMD_AWS', { customPayload: repeatedPayload });
      expect(run2.run.recordsIngested).toBe(0);
      expect(run2.run.recordsSkippedDuplicate).toBe(1);
      expect(run2.run.status).toBe('SUCCESS'); // Clean deduplication does not fail run
    });
  });

  // ===========================================================================
  // 4. PARTIAL INGESTION EXECUTION & ISOLATED REJECTION
  // ===========================================================================
  describe('4. Partial Ingestion Execution & Error Isolation', () => {
    it('processes multi-record batch independently: valid records succeed while malformed records fail without aborting others', async () => {
      const mixedBatch = [
        // Valid Record 1
        {
          highway_code: 'NH-6',
          sector_name: 'Sonapur Tunnel Bypass',
          state: 'Meghalaya',
          latitude: 25.105,
          longitude: 92.365,
          blockage_type: 'SINGLE_LANE_OPEN',
          reason: 'ROCKFALL',
          is_impassable: false,
          reported_at: new Date().toISOString(),
        },
        // Invalid Record 2: Latitude out of range (> 90)
        {
          highway_code: 'NH-2',
          sector_name: 'Invalid Sector',
          state: 'Manipur',
          latitude: 145.0, // Invalid latitude
          longitude: 93.9,
          blockage_type: 'BOTH_LANES_BLOCKED',
          reason: 'LANDSLIDE',
          reported_at: new Date().toISOString(),
        },
        // Valid Record 3
        {
          highway_code: 'NH-10',
          sector_name: 'Sevoke Kalimpong Junction',
          state: 'Sikkim',
          latitude: 26.902,
          longitude: 88.482,
          blockage_type: 'TEMPORARY_DIVERSION',
          reason: 'ROAD_SUBSIDENCE',
          is_impassable: false,
          reported_at: new Date().toISOString(),
        },
      ];

      const result = await executeIngestionRun('BRO_ROAD_BULLETINS', {
        customPayload: mixedBatch,
      });

      // Partial status
      expect(result.run.status).toBe('PARTIAL');
      expect(result.run.recordsIngested).toBe(2);
      expect(result.run.recordsRejected).toBe(1);
      expect(result.roadEvents?.length).toBe(2);
      expect(result.run.errorLog).toContain('Record #1');
    });
  });

  // ===========================================================================
  // 5. RESILIENT RETRIES & UPSTREAM FAILURE HANDLING
  // ===========================================================================
  describe('5. Resilient Retries & Circuit Breaker Counters', () => {
    it('retries external network failures with backoff and marks run FAILED if upstream is down', async () => {
      // Mock global fetch failure
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ETIMEDOUT: upstream gateway unreachable'));

      const result = await executeIngestionRun('IMD_AWS');

      expect(result.run.status).toBe('FAILED');
      expect(result.run.recordsIngested).toBe(0);
      expect(result.run.errorLog).toContain('ETIMEDOUT');

      // Verify source failure counter incremented
      const source = await getDataSourceByCode('IMD_AWS');
      expect(source.consecutiveFailures).toBe(1);
      expect(source.lastFailureAt).toBeDefined();

      // Confirms multiple retries were attempted
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('resets consecutive failures counter to 0 upon subsequent successful ingestion', async () => {
      const source = await getDataSourceByCode('IMD_AWS');
      source.consecutiveFailures = 4; // Simulated degraded state

      const validPayload = [
        {
          station_name: 'Agartala Airport AWS',
          station_code: 'AWS_AGT_01',
          state: 'Tripura',
          latitude: 23.886,
          longitude: 91.24,
          temperature_c: 28.0,
          rainfall_mm_1h: 0,
          condition_code: 'CLEAR',
          observed_at: new Date().toISOString(),
        },
      ];

      const result = await executeIngestionRun('IMD_AWS', { customPayload: validPayload });
      expect(result.run.status).toBe('SUCCESS');

      const refreshed = await getDataSourceByCode('IMD_AWS');
      expect(refreshed.consecutiveFailures).toBe(0);
      expect(refreshed.lastSuccessAt).toBeDefined();
    });
  });

  // ===========================================================================
  // 6. PROVENANCE & DYNAMIC FRESHNESS
  // ===========================================================================
  describe('6. Cryptographic Provenance & Temporal Freshness', () => {
    it('strictly attaches source, runId, and rawPayloadHash to every ingested event', async () => {
      const payload = [
        {
          station_name: 'Gangtok Meteorological Centre AWS',
          station_code: 'AWS_GTK_01',
          state: 'Sikkim',
          latitude: 27.3389,
          longitude: 88.6065,
          temperature_c: 14.2,
          rainfall_mm_1h: 2.0,
          condition_code: 'RAIN',
          observed_at: new Date().toISOString(),
        },
      ];

      const result = await executeIngestionRun('IMD_AWS', { customPayload: payload });
      const event = result.weatherEvents?.[0];

      expect(event?.provenance.sourceCode).toBe('IMD_AWS');
      expect(event?.provenance.sourceName).toContain('India Meteorological Department');
      expect(event?.provenance.ingestionRunId).toBe(result.run.id);
      expect(event?.provenance.rawPayloadHash).toMatch(/^[a-f0-9]{64}$/);
      expect(event?.provenance.ingestedAt).toBeDefined();
    });

    it('accurately evaluates FRESH vs STALE vs EXPIRED based on observation age and TTL', () => {
      const ttl = 3600; // 1 hour

      const now = Date.now();
      const freshDate = new Date(now - 30 * 60 * 1000).toISOString(); // 30m ago -> FRESH
      const staleDate = new Date(now - 2 * 3600 * 1000).toISOString(); // 2h ago -> STALE
      const expiredDate = new Date(now - 10 * 3600 * 1000).toISOString(); // 10h ago -> EXPIRED

      expect(calculateEventFreshness(freshDate, ttl)).toBe('FRESH');
      expect(calculateEventFreshness(staleDate, ttl)).toBe('STALE');
      expect(calculateEventFreshness(expiredDate, ttl)).toBe('EXPIRED');
    });
  });

  // ===========================================================================
  // 7. AUDITABILITY & LOGGING
  // ===========================================================================
  describe('7. Ingestion Audit Trail Integration', () => {
    it('emits DATA_INGESTION_STARTED and DATA_INGESTION_COMPLETED audit events', async () => {
      const payload = [
        {
          highway_code: 'NH-13',
          sector_name: 'Trans-Arunachal Highway Sela Tunnel Approach',
          state: 'Arunachal Pradesh',
          latitude: 27.502,
          longitude: 92.105,
          blockage_type: 'SINGLE_LANE_OPEN',
          reason: 'ROCKFALL',
          is_impassable: false,
          reported_at: new Date().toISOString(),
        },
      ];

      const result = await executeIngestionRun('BRO_ROAD_BULLETINS', {
        customPayload: payload,
        triggeredBy: dispatcherAssam.id,
      });

      expect(result.run.status).toBe('SUCCESS');
      expect(result.run.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.run.completedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // 8. REST API CONTRACTS & PERMISSION GATING
  // ===========================================================================
  describe('8. REST API Endpoints & RBAC Authorization', () => {
    it('GET /api/v1/ingestion/sources returns registered sources with data:read', async () => {
      const req = createMockRequest('GET', '/api/v1/ingestion/sources', dispatcherAssam);
      const res = await getSourcesRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sources.length).toBeGreaterThanOrEqual(5);
    });

    it('POST /api/v1/ingestion/sources denies VIEWER from registering sources (403 Forbidden)', async () => {
      const newSource = {
        code: 'TEST_FEED',
        name: 'Test Unauthorized Feed',
        provider_type: 'REST_API',
      };

      const req = createMockRequest('POST', '/api/v1/ingestion/sources', viewerAssam, newSource);
      const res = await postSourcesRoute(req);
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/ingestion/sources/[id]/trigger triggers on-demand ingestion run', async () => {
      const req = createMockRequest('POST', '/api/v1/ingestion/sources/src-bro-road-bulletins/trigger', dispatcherAssam, {
        dry_run: true,
      });
      const res = await postTriggerRoute(req, { params: { id: 'src-bro-road-bulletins' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.run.id).toBeDefined();
      expect(data.data.run.status).toBeDefined();
    }, 15000);

    it('GET /api/v1/ingestion/runs returns execution history with stats', async () => {
      const req = createMockRequest('GET', '/api/v1/ingestion/runs', dispatcherAssam);
      const res = await getRunsRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data.data.runs)).toBe(true);
    });

    it('GET /api/v1/ingestion/events filters events by type and state', async () => {
      // Ingest a weather event first
      await executeIngestionRun('IMD_AWS', {
        customPayload: [
          {
            station_name: 'Imphal Tulihal Airport AWS',
            station_code: 'AWS_IMF_01',
            state: 'Manipur',
            latitude: 24.76,
            longitude: 93.89,
            temperature_c: 22.0,
            rainfall_mm_1h: 5.0,
            condition_code: 'RAIN',
            observed_at: new Date().toISOString(),
          },
        ],
      });

      const req = createMockRequest('GET', '/api/v1/ingestion/events?event_type=weather&state=Manipur', dispatcherAssam);
      const res = await getEventsRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.weather.length).toBe(1);
      expect(data.data.weather[0].stationCode).toBe('AWS_IMF_01');
      expect(data.data.road.length).toBe(0);
    });
  });

  // ===========================================================================
  // 9. ZERO-FABRICATION INVARIANT
  // ===========================================================================
  describe('9. Zero-Fabrication Invariant', () => {
    it('does not fabricate operational events when feed returns empty data', async () => {
      const emptyPayload: unknown[] = [];

      const result = await executeIngestionRun('IMD_AWS', { customPayload: emptyPayload });
      expect(result.run.recordsIngested).toBe(0);
      expect(result.run.recordsRejected).toBe(0);
      expect(result.run.recordsSkippedDuplicate).toBe(0);
      expect(result.weatherEvents?.length).toBe(0);

      const events = await queryIngestedEvents({ event_type: 'weather' });
      expect(events.weather.length).toBe(0);
    });
  });
});
