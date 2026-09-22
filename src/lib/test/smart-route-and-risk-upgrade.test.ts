import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postPlanRoute } from '@/app/api/v1/routes/plan/route';
import { POST as postCalculateRisk } from '@/app/api/v1/risk/calculate/route';
import { GET as getRiskEvents } from '@/app/api/v1/risk/events/route';
import {
  listRiskEvents,
  listCanonicalRiskItems,
  seedBaselineRiskEvents,
  toCanonicalRiskItem,
  intersectRouteWithHazards,
  _resetRiskStore,
  BASELINE_RISK_EVENTS,
} from '@/lib/services/risk.service';
import { executeCopilotReasoning } from '@/lib/engines/copilot-engine';
import { useStore } from '@/lib/store';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

function createMockRequest(
  method: string,
  url: string,
  body?: unknown,
  role = 'DISPATCHER'
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const token = signAuthToken({
    userId: 'usr_test_dispatcher',
    email: 'dispatcher.test@assam.gov.in',
    name: 'Test Dispatcher',
    role: role as any,
    organizationId: 'org_assam_civil_supplies',
  });
  headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
  headers.set('Authorization', `Bearer ${token}`);

  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  } as any);
}

describe('Smart Route AI & Predictive Risk Intelligence Complete Architecture', () => {
  beforeEach(() => {
    _resetRiskStore();
    seedBaselineRiskEvents();
  });

  // =========================================================================
  // 1. SMART ROUTE AI API & VALIDATION
  // =========================================================================
  describe('1. Smart Route AI Planning & Calculations', () => {
    it('successfully computes route between known seed locations (Guwahati -> Tawang) with alternatives and segments', async () => {
      const req = createMockRequest('POST', '/api/v1/routes/plan', {
        origin_id: 'LOC001', // Guwahati
        destination_id: 'LOC024', // Tawang
        transport_mode: 'HEAVY_TRUCK',
        cargo_type: 'Emergency Medical Consignment',
        cargo_weight_kg: 750,
      });

      const res = await postPlanRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.routes).toBeDefined();
      expect(json.data.routes.length).toBeGreaterThan(0);

      const primary = json.data.routes[0];
      expect(primary.distance_km).toBeGreaterThan(300);
      expect(primary.duration_minutes).toBeGreaterThan(0);
      expect(primary.coordinates.length).toBeGreaterThan(1);
      expect(primary.segments.length).toBeGreaterThan(0);

      // Alternatives present
      expect(json.data.alternatives).toBeDefined();
      expect(json.data.alternatives.length).toBeGreaterThan(0);
      const alt = json.data.alternatives[0];
      expect(alt.name).toBeDefined();
      expect(alt.distanceKm).toBeGreaterThan(0);
      expect(alt.durationMinutes).toBeGreaterThan(0);
      expect(alt.reasonForAlternative).toBeDefined();
    });

    it('strictly rejects route calculation when origin and destination are identical', async () => {
      const req = createMockRequest('POST', '/api/v1/routes/plan', {
        origin_id: 'LOC001',
        destination_id: 'LOC001',
      });

      const res = await postPlanRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(['SAME_LOCATION_ERROR', 'VALIDATION_ERROR']).toContain(json.error.code);
    });

    it('resolves coordinates directly for seed location IDs without external geocoder failure', async () => {
      const req = createMockRequest('POST', '/api/v1/routes/plan', {
        origin_id: 'LOC001',
        destination_id: 'LOC002',
      });

      const res = await postPlanRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.origin.name).toBe('Guwahati');
      expect(json.data.destination.name).toBe('Imphal');
    });
  });

  // =========================================================================
  // 2. RISK INTELLIGENCE CANONICAL DATA MODEL & VERIFIED INSTITUTIONAL BULLETINS
  // =========================================================================
  describe('2. Canonical Risk Model & Verified Institutional Bulletins', () => {
    it('seeds and verifies 6 institutional hazard advisories matching Northeast highway corridors', () => {
      expect(BASELINE_RISK_EVENTS.length).toBe(6);

      // BRO Project Vartak NH-13
      const broNh13 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-BRO-NH13');
      expect(broNh13).toBeDefined();
      expect(broNh13?.provenance.sourceCode).toBe('BRO_PROJECT_VARTAK');
      expect(broNh13?.state).toBe('Arunachal Pradesh');
      expect(broNh13?.affectedCorridors).toContain('NH-13');

      // Nagaland PWD NH-29
      const pwdNh29 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-PWD-NH29');
      expect(pwdNh29).toBeDefined();
      expect(pwdNh29?.severity).toBe('CRITICAL');
      expect(pwdNh29?.state).toBe('Nagaland');

      // CWC Flood Forecasting NH-37
      const cwcNh37 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-CWC-NH37');
      expect(cwcNh37).toBeDefined();
      expect(cwcNh37?.category).toBe('FLASH_FLOOD');
      expect(cwcNh37?.state).toBe('Assam');

      // IMD Sonapur Tunnel NH-06
      const imdNh06 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-IMD-NH06');
      expect(imdNh06).toBeDefined();
      expect(imdNh06?.state).toBe('Meghalaya');

      // BRO Project Swastik NH-10
      const broNh10 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-BRO-NH10');
      expect(broNh10).toBeDefined();
      expect(broNh10?.state).toBe('Sikkim');

      // NHAI Saraighat NH-27
      const nhaiNh27 = BASELINE_RISK_EVENTS.find((e) => e.id === 'RSK-NHAI-NH27');
      expect(nhaiNh27).toBeDefined();
      expect(nhaiNh27?.affectedCorridors).toContain('NH-27');
    });

    it('maps situational RiskEvents to canonical Section 10 RiskItems with authentic dataStatus', () => {
      const items = listCanonicalRiskItems();
      expect(items.length).toBeGreaterThanOrEqual(6);

      const item = items[0];
      expect(item.id).toBeDefined();
      expect(item.type).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(item.severity);
      expect(item.probability).toBeGreaterThan(0);
      expect(item.latitude).toBeDefined();
      expect(item.longitude).toBeDefined();
      expect(item.affectedArea).toBeDefined();
      expect(item.impact).toBeDefined();
      expect(item.source).toBeDefined();
      expect(item.timestamp).toBeDefined();
      expect(item.expiresAt).toBeDefined();
      expect(item.confidence).toBeGreaterThan(0.5);
      expect(item.recommendation).toBeDefined();
      expect(['LIVE', 'RECENT', 'STALE', 'UNAVAILABLE']).toContain(item.dataStatus);
    });

    it('GET /api/v1/risk/events returns list with canonicalItems and institutional provenance', async () => {
      const req = createMockRequest('GET', '/api/v1/risk/events?state=Assam');
      const res = await getRiskEvents(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.events.length).toBeGreaterThanOrEqual(2); // CWC and NHAI
      expect(json.data.canonicalItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 3. ROUTE-HAZARD INTERSECTION ENGINE
  // =========================================================================
  describe('3. Route-Hazard Intersection Engine', () => {
    it('detects intersecting hazards when route polyline passes near hazard coordinates', () => {
      // Create a polyline passing through Sonapur Tunnel (25.1167, 92.3667)
      const routePoints: [number, number][] = [
        [91.73, 26.14], // Guwahati
        [92.366, 25.116], // Sonapur Tunnel vicinity
        [92.75, 24.82], // Silchar
      ];

      const intersections = intersectRouteWithHazards(routePoints, BASELINE_RISK_EVENTS);
      expect(intersections.length).toBeGreaterThan(0);

      const sonapurMatch = intersections.find((i) => i.hazardId === 'RSK-IMD-NH06');
      expect(sonapurMatch).toBeDefined();
      expect(sonapurMatch?.distanceToRouteKm).toBeLessThan(2.0);
      expect(sonapurMatch?.severity).toBe('HIGH');
      expect(sonapurMatch?.recommendedAction).toBeDefined();
      expect(sonapurMatch?.warningMessage).toContain('Sonapur Tunnel');
    });

    it('returns empty intersections for route coordinates far away from active hazards', () => {
      const routePoints: [number, number][] = [
        [90.0, 26.0],
        [90.1, 26.1],
      ];

      const intersections = intersectRouteWithHazards(routePoints, BASELINE_RISK_EVENTS);
      expect(intersections.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. SHARED STATE & COPILOT BI-DIRECTIONAL INTEGRATION
  // =========================================================================
  describe('4. Shared State & Copilot Bi-Directional Grounding', () => {
    it('updates and persists sharedRoute and activeRisks in Zustand store', () => {
      const store = useStore.getState();

      store.setSharedRoute({
        routeId: 'rte_test_shared',
        originId: 'LOC001',
        originName: 'Guwahati',
        originCoords: { lat: 26.14, lng: 91.73 },
        destinationId: 'LOC024',
        destinationName: 'Tawang',
        destinationCoords: { lat: 27.58, lng: 91.86 },
        distanceKm: 485.6,
        durationMinutes: 720,
        formattedEta: '12h 00m',
        transportMode: 'HEAVY_TRUCK',
        coordinates: [
          [91.73, 26.14],
          [91.86, 27.58],
        ],
        segments: [],
        provider: 'OSRM Highway Engine',
        calculatedAt: new Date().toISOString(),
        alternatives: [
          {
            id: 'alt-1',
            name: 'Trans-Arunachal Western Bypass',
            distanceKm: 512.4,
            durationMinutes: 770,
            formattedEta: '12h 50m',
            riskScore: 0.38,
            riskSeverity: 'MEDIUM',
            reasonForAlternative: 'Bypasses flood prone plains with higher elevation stability',
          },
        ],
      });

      const updated = useStore.getState().sharedRoute;
      expect(updated).toBeDefined();
      expect(updated?.distanceKm).toBe(485.6);
      expect(updated?.alternatives?.length).toBe(1);
    });

    it('Copilot reasons with live duration and ETA for "how long will this route take"', async () => {
      const mockSharedRoute = {
        routeId: 'rte_live_456',
        originId: 'Guwahati Hub',
        originName: 'Guwahati Hub',
        originCoords: { lat: 26.14, lng: 91.73 },
        destinationId: 'Tawang Forward Post',
        destinationName: 'Tawang Forward Post',
        destinationCoords: { lat: 27.58, lng: 91.86 },
        distanceKm: 485.6,
        durationMinutes: 720,
        formattedEta: '12h 00m',
        transportMode: '4x4 Mountain Fleet',
        coordinates: [
          [91.73, 26.14],
          [91.86, 27.58],
        ],
        segments: [],
        provider: 'OSRM Road Graph',
        calculatedAt: new Date().toISOString(),
      };

      const res = await executeCopilotReasoning('How long will this route take?', {
        sharedRoute: mockSharedRoute as any,
      });

      expect(res.intent).toBe('ROUTE_OPTIMIZATION');
      expect(res.response).toContain('485.6 km');
      expect(res.response).toContain('12h 00m');
      expect(res.response).toContain('720 minutes');
    });

    it('Copilot references evaluated route alternatives for "find an alternative route"', async () => {
      const mockSharedRoute = {
        routeId: 'rte_live_456',
        originId: 'LOC001',
        originName: 'Guwahati',
        originCoords: { lat: 26.14, lng: 91.73 },
        destinationId: 'LOC024',
        destinationName: 'Tawang',
        destinationCoords: { lat: 27.58, lng: 91.86 },
        distanceKm: 485.6,
        durationMinutes: 720,
        formattedEta: '12h 00m',
        transportMode: '4x4 Mountain Fleet',
        coordinates: [],
        segments: [],
        provider: 'OSRM Road Graph',
        calculatedAt: new Date().toISOString(),
        alternatives: [
          {
            id: 'alt_dirang_bypass',
            name: 'Dirang High-Altitude Bypass',
            distanceKm: 510.2,
            durationMinutes: 780,
            formattedEta: '13h 00m',
            riskScore: 0.35,
            riskSeverity: 'MEDIUM' as const,
            reasonForAlternative: 'Bypasses Sela low-cut rockfall zones',
          },
        ],
      };

      const res = await executeCopilotReasoning('Find another route for this consignment', {
        sharedRoute: mockSharedRoute as any,
      });

      expect(res.response).toContain('Dirang High-Altitude Bypass');
      expect(res.response).toContain('510.2 km');
      expect(res.response).toContain('Bypasses Sela low-cut rockfall zones');
    });
  });
});
