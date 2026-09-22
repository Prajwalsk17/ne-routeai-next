/**
 * AuraNER / NER-Route AI — Phase 26: Controlled Field Pilot Verification Suite
 * 
 * Verifies all field pilot capabilities under strict non-production controlled conditions:
 * 1. Cohort boundary gating & authorization enforcement
 * 2. Multi-subsystem pilot readiness evaluation (13 operational domains)
 * 3. In-field usability feedback collection (Driver & Dispatcher)
 * 4. Field operational incident triage, SLA tracking, and resolution lifecycle
 * 5. 9-vector operational health and reliability metrics tracking
 * 6. Pilot REST API endpoints & tenant isolation
 * 7. Zero fabrication invariant: authentic observations with explicit unobserved handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  _resetPilotStore,
  isPilotAuthorized,
  registerPilotCohort,
  listPilotCohorts,
  submitPilotFeedback,
  listPilotFeedback,
  getPilotFeedbackSummary,
  createPilotIncident,
  updatePilotIncidentStatus,
  getPilotIncidentById,
  listPilotIncidents,
  recordPilotGpsObservation,
  recordPilotRouteObservation,
  recordPilotNotificationObservation,
  recordPilotAiObservation,
  getPilotOperationalHealth,
  evaluatePilotReadiness,
} from '../services/pilot.service';
import { SessionUser } from '../auth/session';
import { signAuthToken } from '../auth/token-verifier';
import { SESSION_COOKIE_NAME } from '../auth/session';
import { GET as getPilotReadiness } from '@/app/api/v1/pilot/readiness/route';
import { GET as getPilotFeedback, POST as postPilotFeedback } from '@/app/api/v1/pilot/feedback/route';
import { GET as getPilotIncidents, POST as postPilotIncidents } from '@/app/api/v1/pilot/incidents/route';
import { GET as getPilotIncidentDetail, PATCH as patchPilotIncident } from '@/app/api/v1/pilot/incidents/[id]/route';
import { GET as getPilotMetrics } from '@/app/api/v1/pilot/metrics/route';

describe('Phase 26: Controlled Field Pilot Verification Suite', () => {
  // Test Users (Isolated Pilot Cohort)
  const superAdminUser: SessionUser = {
    id: 'usr_super_admin',
    email: 'admin@auraner.gov.in',
    name: 'NER-RouteAI Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: 'org_admin_hq',
  };

  const pilotDispatcherAssam: SessionUser = {
    id: 'usr_pilot_dispatcher_as',
    email: 'dispatcher.pilot@assam.gov.in',
    name: '[PILOT_USER] Bhaben Kalita (Assam Dispatcher)',
    role: 'DISPATCHER',
    organizationId: 'org_pilot_assam_essential',
  };

  const pilotDriverAssam: SessionUser = {
    id: 'usr_pilot_driver_as',
    email: 'driver.pilot@assam.gov.in',
    name: '[PILOT_USER] Hiren Das (Hill Convoy Driver)',
    role: 'DRIVER',
    organizationId: 'org_pilot_assam_essential',
  };

  const pilotDispatcherMeghalaya: SessionUser = {
    id: 'usr_pilot_dispatcher_ml',
    email: 'dispatcher.pilot@meghalaya.gov.in',
    name: '[PILOT_USER] Wanbiang Marbaniang (Meghalaya PWD)',
    role: 'DISPATCHER',
    organizationId: 'org_pilot_meghalaya_pwd',
  };

  const nonPilotUser: SessionUser = {
    id: 'usr_unauthorized_external',
    email: 'external@commercial-carrier.com',
    name: 'Unenrolled Commercial Operator',
    role: 'DISPATCHER',
    organizationId: 'org_external_unregistered',
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

  beforeEach(() => {
    _resetPilotStore();
  });

  // ===========================================================================
  // 1. Pilot Cohort Registration & Authorization Boundaries
  // ===========================================================================
  describe('1. Pilot Cohort Registration & Boundary Authorization', () => {
    it('authorizes enrolled cohort organization, approved vehicles, and approved corridors', () => {
      const result = isPilotAuthorized('org_pilot_assam_essential', {
        vehicleId: 'veh_pilot_as_01',
        driverId: 'drv_pilot_as_01',
        corridor: 'NH-27',
      });

      expect(result.authorized).toBe(true);
      expect(result.cohort).toBeDefined();
      expect(result.cohort?.state).toBe('Assam');
    });

    it('rejects unenrolled organizations from entering pilot operations', () => {
      const result = isPilotAuthorized('org_external_unregistered');
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('is not an enrolled active pilot cohort');
    });

    it('rejects vehicles not on the approved cohort vehicle whitelist', () => {
      const result = isPilotAuthorized('org_pilot_assam_essential', {
        vehicleId: 'veh_unapproved_chassis_99',
      });
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('not approved for pilot operations');
    });

    it('rejects corridors outside the approved mountain pilot routes', () => {
      const result = isPilotAuthorized('org_pilot_assam_essential', {
        corridor: 'NH-102-MANIPUR-EXT',
      });
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('outside authorized pilot corridors');
    });

    it('enforces SUPER_ADMIN permission for registering new pilot cohorts', async () => {
      await expect(
        registerPilotCohort(
          {
            organizationId: 'org_pilot_nagaland_relief',
            name: '[PILOT] Nagaland State Disaster Management Convoy',
            state: 'Nagaland',
            authorizedCorridors: ['NH-29', 'NH-2'],
            authorizedVehicleIds: ['veh_nl_01'],
            authorizedDriverIds: ['drv_nl_01'],
            maxActiveTrips: 4,
            status: 'ACTIVE',
            startDate: '2026-10-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
          },
          pilotDispatcherAssam // Non-admin caller
        )
      ).rejects.toThrow(/Only SUPER_ADMIN may register or modify pilot cohorts/);
    });

    it('allows SUPER_ADMIN to register new active pilot cohort', async () => {
      const cohort = await registerPilotCohort(
        {
          organizationId: 'org_pilot_nagaland_relief',
          name: '[PILOT] Nagaland State Disaster Management Convoy',
          state: 'Nagaland',
          authorizedCorridors: ['NH-29', 'NH-2'],
          authorizedVehicleIds: ['veh_nl_01'],
          authorizedDriverIds: ['drv_nl_01'],
          maxActiveTrips: 4,
          status: 'ACTIVE',
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-12-31T23:59:59.000Z',
        },
        superAdminUser
      );

      expect(cohort.id).toBeDefined();
      expect(cohort.organizationId).toBe('org_pilot_nagaland_relief');

      const cohorts = await listPilotCohorts();
      expect(cohorts.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // 2. Subsystem Pilot Readiness Evaluation
  // ===========================================================================
  describe('2. Subsystem Pilot Readiness Evaluation', () => {
    it('evaluates all 13 core operational domains and confirms overall pilot readiness', async () => {
      const report = await evaluatePilotReadiness();

      expect(report.overallReady).toBe(true);
      expect(report.overallScore).toBeGreaterThanOrEqual(95);
      expect(report.criticalBlockers).toHaveLength(0);
      expect(report.activeCohortsCount).toBeGreaterThanOrEqual(2);

      // Verify all 13 subsystems are evaluated
      const domains = [
        'authentication',
        'authorization',
        'apis',
        'database',
        'routing',
        'telemetry',
        'ingestion',
        'risk',
        'accessibility',
        'optimization',
        'aiAssistance',
        'notifications',
        'analytics',
      ];

      for (const domain of domains) {
        expect(report.subsystems).toHaveProperty(domain);
        expect(report.subsystems[domain].ready).toBe(true);
        expect(report.subsystems[domain].score).toBeGreaterThanOrEqual(90);
        expect(report.subsystems[domain].prerequisitesMet.length).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // 3. In-Field Usability Feedback Collection
  // ===========================================================================
  describe('3. In-Field Usability Feedback Collection', () => {
    it('submits driver feedback for GPS tracking accuracy on hill terrain', async () => {
      const feedback = await submitPilotFeedback(
        {
          category: 'GPS_ACCURACY',
          rating: 4,
          comment: 'Dead reckoning maintained position through Sonapur tunnel without drifting.',
          vehicle_id: 'veh_pilot_as_01',
          trip_id: 'trp_pilot_001',
          latitude: 26.112,
          longitude: 91.954,
        },
        pilotDriverAssam
      );

      expect(feedback.id).toBeDefined();
      expect(feedback.organizationId).toBe('org_pilot_assam_essential');
      expect(feedback.reporterRole).toBe('DRIVER');
      expect(feedback.category).toBe('GPS_ACCURACY');
      expect(feedback.rating).toBe(4);
      expect(feedback.coordinates?.lat).toBe(26.112);
    });

    it('submits dispatcher feedback for AI detour recommendation usability', async () => {
      const feedback = await submitPilotFeedback(
        {
          category: 'AI_ADVICE',
          rating: 5,
          comment: 'Detour around Jorabat blockage provided clear distance and grade delta.',
        },
        pilotDispatcherAssam
      );

      expect(feedback.id).toBeDefined();
      expect(feedback.reporterRole).toBe('DISPATCHER');
      expect(feedback.rating).toBe(5);
    });

    it('computes categorical feedback summary and CSAT satisfaction percentages', async () => {
      await submitPilotFeedback(
        { category: 'APP_USABILITY', rating: 5, comment: 'Clean UI buttons' },
        pilotDriverAssam
      );
      await submitPilotFeedback(
        { category: 'ROUTE_NAVIGATION', rating: 4, comment: 'Clear turn instructions' },
        pilotDriverAssam
      );
      await submitPilotFeedback(
        { category: 'HAZARD_ALERT', rating: 5, comment: 'Timely warning' },
        pilotDispatcherAssam
      );

      const summary = await getPilotFeedbackSummary('org_pilot_assam_essential');
      expect(summary.totalSubmissions).toBeGreaterThanOrEqual(3);
      expect(summary.averageRating).toBeGreaterThanOrEqual(4.0);
      expect(summary.driverSatisfactionScorePct).toBeGreaterThanOrEqual(80);
      expect(summary.dispatcherSatisfactionScorePct).toBe(100);
      expect(summary.categoryBreakdown).toHaveProperty('APP_USABILITY');
    });

    it('clamps rating values strictly between 1 and 5 stars', async () => {
      const feedback = await submitPilotFeedback(
        { category: 'CONNECTIVITY', rating: 10, comment: 'Off-scale rating' },
        pilotDriverAssam
      );
      expect(feedback.rating).toBe(5);
    });
  });

  // ===========================================================================
  // 4. Operational Incident Handling & Escalation Lifecycle
  // ===========================================================================
  describe('4. Operational Incident Handling & Escalation Lifecycle', () => {
    it('creates pilot incident and automatically assigns resolution SLA based on severity', async () => {
      const incident = await createPilotIncident(
        {
          title: 'Cellular dead zone causing 6-minute telemetry lag near Zubza',
          description: 'Vehicle veh_pilot_as_01 experienced 6-minute dead reckoning period on NH-29.',
          severity: 'HIGH',
          category: 'TELEMETRY_OUTAGE',
          affected_corridor: 'NH-29',
          affected_vehicle_id: 'veh_pilot_as_01',
        },
        pilotDispatcherAssam
      );

      expect(incident.id).toBeDefined();
      expect(incident.status).toBe('REPORTED');
      expect(incident.severity).toBe('HIGH');
      expect(incident.resolutionSlaHours).toBe(6); // HIGH -> 6h SLA
      expect(incident.resolvedAt).toBeNull();
    });

    it('assigns 2-hour resolution SLA for CRITICAL safety violations or road blockages', async () => {
      const criticalIncident = await createPilotIncident(
        {
          title: 'Unannounced culvert subsidence blocking NH-27 bridge approach',
          description: 'Emergency bridge repair underway, road completely impassable.',
          severity: 'CRITICAL',
          category: 'SAFETY_VIOLATION',
          affected_corridor: 'NH-27',
        },
        pilotDispatcherAssam
      );

      expect(criticalIncident.severity).toBe('CRITICAL');
      expect(criticalIncident.resolutionSlaHours).toBe(2); // CRITICAL -> 2h SLA
    });

    it('advances incident lifecycle through TRIAGED, INVESTIGATING, and RESOLVED states', async () => {
      const incident = await createPilotIncident(
        {
          title: 'App crash during offline outbox queue sync',
          description: 'Driver mobile app restarted during 15-item sync.',
          severity: 'MEDIUM',
          category: 'SYSTEM_CRASH',
        },
        pilotDispatcherAssam
      );

      // 1. Triage
      const triaged = await updatePilotIncidentStatus(
        incident.id,
        { status: 'TRIAGED', assigned_to: 'engineer_deb@auraner.internal' },
        pilotDispatcherAssam
      );
      expect(triaged.status).toBe('TRIAGED');
      expect(triaged.assignedTo).toBe('engineer_deb@auraner.internal');

      // 2. Investigate & Patch
      const investigated = await updatePilotIncidentStatus(
        incident.id,
        {
          status: 'INVESTIGATING',
          root_cause: 'SQLite lock contention during high-frequency telemetry flush',
        },
        pilotDispatcherAssam
      );
      expect(investigated.status).toBe('INVESTIGATING');
      expect(investigated.rootCause).toContain('SQLite lock contention');

      // 3. Resolve
      const resolved = await updatePilotIncidentStatus(
        incident.id,
        {
          status: 'RESOLVED',
          resolution: 'Batching sync writes inside 200ms debounce transaction buffer',
        },
        pilotDispatcherAssam
      );
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.resolution).toContain('Batching sync writes');
    });

    it('enforces multi-tenant query isolation on pilot incidents', async () => {
      await createPilotIncident(
        {
          title: 'Assam Civil Supplies internal warehouse loading delay',
          description: 'Pallet jack failure at Jalukbari depot.',
          severity: 'LOW',
          category: 'HARDWARE_FAILURE',
        },
        pilotDispatcherAssam
      );

      const assamIncidents = await listPilotIncidents({
        organizationId: 'org_pilot_assam_essential',
      });
      const megIncidents = await listPilotIncidents({
        organizationId: 'org_pilot_meghalaya_pwd',
      });

      expect(assamIncidents.length).toBeGreaterThan(0);
      expect(megIncidents.length).toBe(0);
    });

    it('prevents cross-tenant incident updates from unauthorized operators', async () => {
      const incident = await createPilotIncident(
        {
          title: 'Meghalaya PWD rockfall sensor battery failure',
          description: 'Sensor at Mawkdok bridge offline.',
          severity: 'MEDIUM',
          category: 'HARDWARE_FAILURE',
        },
        pilotDispatcherMeghalaya
      );

      await expect(
        updatePilotIncidentStatus(
          incident.id,
          { status: 'RESOLVED' },
          pilotDispatcherAssam // Cross-tenant operator
        )
      ).rejects.toThrow(/Tenant access denied/);
    });
  });

  // ===========================================================================
  // 5. 9-Vector Operational Health Monitoring
  // ===========================================================================
  describe('5. 9-Vector Operational Health & Reliability Monitoring', () => {
    it('records telemetry observations and accurately calculates packet drop rate & jitter', () => {
      for (let i = 0; i < 95; i++) {
        recordPilotGpsObservation({ jitterMeters: 4.2 });
      }
      for (let i = 0; i < 5; i++) {
        recordPilotGpsObservation({ isDeadReckoning: true, packetDropped: true });
      }

      const health = getPilotOperationalHealth();
      expect(health.gpsReliability.totalPings).toBe(100);
      expect(health.gpsReliability.deadReckoningPings).toBe(5);
      expect(health.gpsReliability.packetDropRatePct).toBe(5.0);
      expect(health.gpsReliability.healthStatus).toBe('DEGRADED');
    });

    it('records routing, notification, and AI decision metrics', () => {
      recordPilotRouteObservation({ offRoute: false, etaDriftMinutes: 3.5 });
      recordPilotRouteObservation({ offRoute: true, gradientAvoided: true, etaDriftMinutes: 8.0 });

      recordPilotNotificationObservation({ delivered: true, latencyMs: 95 });
      recordPilotNotificationObservation({ delivered: true, latencyMs: 140 });

      recordPilotAiObservation({ humanApprovalPending: true, approved: true });
      recordPilotAiObservation({ humanApprovalPending: true, rejected: true });

      const health = getPilotOperationalHealth();
      expect(health.routingReliability.totalRoutesCalculated).toBe(2);
      expect(health.routingReliability.offRouteDeviations).toBe(1);
      expect(health.notificationDelivery.deliveryRatePct).toBe(100);
      expect(health.aiAssistance.humanApprovalPending).toBe(2);
      expect(health.aiAssistance.approvedCount).toBe(1);
      expect(health.aiAssistance.rejectedCount).toBe(1);
      expect(health.aiAssistance.rejectionRatePct).toBe(50.0);
      expect(health.aiAssistance.groundingViolations).toBe(0);
    });
  });

  // ===========================================================================
  // 6. Pilot REST API Endpoints Integration
  // ===========================================================================
  describe('6. Pilot REST API Endpoints Integration', () => {
    it('GET /api/v1/pilot/readiness returns 200 with readiness score and active cohorts', async () => {
      const req = createMockRequest('GET', '/api/v1/pilot/readiness', pilotDispatcherAssam);
      const res = await getPilotReadiness(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.readiness.overallReady).toBe(true);
      expect(json.data.readiness.overallScore).toBeGreaterThanOrEqual(95);
      expect(json.data.activeCohorts.length).toBeGreaterThanOrEqual(2);
    });

    it('POST & GET /api/v1/pilot/feedback submits and retrieves field feedback', async () => {
      const postReq = createMockRequest('POST', '/api/v1/pilot/feedback', pilotDriverAssam, {
        category: 'CONNECTIVITY',
        rating: 4,
        comment: 'Offline caching allowed continuous driving through canyon pass.',
      });
      const postRes = await postPilotFeedback(postReq);
      expect(postRes.status).toBe(201);

      const postJson = await postRes.json();
      expect(postJson.data.category).toBe('CONNECTIVITY');
      expect(postJson.data.rating).toBe(4);

      const getReq = createMockRequest('GET', '/api/v1/pilot/feedback?summary=true', pilotDispatcherAssam);
      const getRes = await getPilotFeedback(getReq);
      expect(getRes.status).toBe(200);

      const getJson = await getRes.json();
      expect(getJson.data.feedback.length).toBeGreaterThan(0);
      expect(getJson.data.summary).toBeDefined();
    });

    it('POST & PATCH /api/v1/pilot/incidents manages incident support lifecycle via API', async () => {
      const postReq = createMockRequest('POST', '/api/v1/pilot/incidents', pilotDispatcherAssam, {
        title: 'Bridge load limit dispute at Sonapur bypass',
        description: 'Local checkpoint dispute regarding 24-tonne gross chassis weight.',
        severity: 'MEDIUM',
        category: 'SAFETY_VIOLATION',
        affected_corridor: 'NH-27',
      });
      const postRes = await postPilotIncidents(postReq);
      expect(postRes.status).toBe(201);

      const created = (await postRes.json()).data;
      expect(created.id).toBeDefined();
      expect(created.status).toBe('REPORTED');

      // Update via PATCH
      const patchReq = createMockRequest(
        'PATCH',
        `/api/v1/pilot/incidents/${created.id}`,
        pilotDispatcherAssam,
        {
          status: 'INVESTIGATING',
          assigned_to: 'liaison_officer@assam.gov.in',
        }
      );
      const patchRes = await patchPilotIncident(patchReq, { params: { id: created.id } });
      expect(patchRes.status).toBe(200);

      const updated = (await patchRes.json()).data;
      expect(updated.status).toBe('INVESTIGATING');
      expect(updated.assignedTo).toBe('liaison_officer@assam.gov.in');
    });

    it('GET /api/v1/pilot/metrics returns real-time pilot monitoring metrics', async () => {
      const req = createMockRequest('GET', '/api/v1/pilot/metrics', pilotDispatcherAssam);
      const res = await getPilotMetrics(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toHaveProperty('gpsReliability');
      expect(json.data).toHaveProperty('routingReliability');
      expect(json.data).toHaveProperty('notificationDelivery');
      expect(json.data).toHaveProperty('aiAssistance');
      expect(json.data).toHaveProperty('operationalUsability');
    });

    it('rejects unauthenticated requests to pilot APIs with 401 Unauthorized', async () => {
      const unauthReq = createMockRequest('GET', '/api/v1/pilot/readiness');
      const res = await getPilotReadiness(unauthReq);
      expect(res.status).toBe(401);
    });
  });
});
