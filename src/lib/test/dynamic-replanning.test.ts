/**
 * AuraNER / NER-Route AI — Phase 19: Dynamic Replanning Test Suite
 * 
 * Comprehensive tests verifying:
 * 1. Meaningful Change Detection (GPS deviation > 500m, forward road hazards < 10km)
 * 2. Alternative Route Calculation & Zero Data Fabrication
 * 3. Vehicle & Operational Constraint Validation (Gradient, 4WD, Cold-Chain)
 * 4. Infeasibility / Failure Handling (Explicit violations diagnostics, no fabricated routes)
 * 5. Immutable Route Versioning & Non-Silent Mutation (Proposal does not mutate active trip; Version N+1 committed upon approval)
 * 6. Mandatory Human Approval Workflow for Critical In-Transit Detours (PENDING_APPROVAL -> APPROVED / REJECTED)
 * 7. Multi-Tenancy Isolation & Organization Scoping
 * 8. REST API Contracts & RBAC Enforcement (201 for DISPATCHER, 403 for VIEWER)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  detectReplanningTriggers,
  proposeReplanning,
  approveReplanning,
  rejectReplanning,
  applyReplanning,
  listReplanningProposals,
  getReplanningProposalById,
  _resetReplanningStore,
} from '@/lib/services/replanning.service';
import { saveRoute, getRouteById, _resetRouteStore } from '@/lib/services/route.service';
import { setRoutingServiceForTesting, MockTestRoutingService } from '@/lib/routing';
import { createVehicle, _resetFleetStore } from '@/lib/services/fleet.service';
import { createDriver, _resetDriverStore } from '@/lib/services/driver.service';
import { createTripRecord, updateTripRecord, _resetTripStore } from '@/lib/services/trip.service';
import { POST as postEvaluateRoute } from '@/app/api/v1/replanning/evaluate/route';
import { GET as getProposalsRoute } from '@/app/api/v1/replanning/proposals/route';
import { GET as getProposalDetailRoute } from '@/app/api/v1/replanning/proposals/[id]/route';
import { POST as postApproveRoute } from '@/app/api/v1/replanning/proposals/[id]/approve/route';
import { POST as postRejectRoute } from '@/app/api/v1/replanning/proposals/[id]/reject/route';
import { POST as postApplyRoute } from '@/app/api/v1/replanning/proposals/[id]/apply/route';

// Test Actors
const dispatcherAssam: SessionUser = {
  id: 'usr_dispatcher_assam',
  email: 'dispatcher@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const adminNagaland: SessionUser = {
  id: 'usr_admin_nagaland',
  email: 'admin@nagaland.gov.in',
  name: 'Temjen Imna',
  role: 'ORG_ADMIN',
  organizationId: 'org_nagaland_relief',
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

describe('Phase 19: Dynamic Replanning Architecture', () => {
  let sampleRouteId: string;
  let sampleTripId: string;
  let sampleVehicleId: string;
  let sampleDriverId: string;

  beforeEach(async () => {
    setRoutingServiceForTesting(new MockTestRoutingService());
    _resetReplanningStore();
    _resetTripStore();
    _resetRouteStore();
    _resetFleetStore();
    _resetDriverStore();

    // 1. Establish Route Corridor with Version 1
    const route = await saveRoute(
      {
        name: 'Guwahati - Kohima Mountain Highway',
        originLocationId: 'loc-gau-01',
        destinationLocationId: 'loc-koh-01',
        originCoords: { lat: 26.14, lng: 91.73 },
        destinationCoords: { lat: 25.67, lng: 94.10 },
      },
      dispatcherAssam
    );
    sampleRouteId = route.id;

    // 2. Establish Vehicle
    const vehicle = await createVehicle(
      {
        registrationNumber: 'AS-01-AX-4001',
        makeModel: 'Tata Xenon 4WD Utility',
        type: 'UTILITY_4X4',
        payloadCapacityKg: 1800,
        cargoVolumeM3: 6.0,
        maxGradientPct: 35,
        maxWidthMeters: 2.1,
        waterCrossingDepthMm: 650,
        hasColdChain: false,
        fuelType: 'DIESEL',
        fuelCapacityLiters: 80,
        currentFuelPct: 90,
        facilityId: null,
        currentLocation: null,
        assignedDriverId: null,
        lastTelemetryAt: null,
        status: 'AVAILABLE',
      },
      dispatcherAssam
    );
    sampleVehicleId = vehicle.id;

    // 3. Establish Driver
    const driver = await createDriver(
      {
        userId: 'usr_driver_dorjee',
        name: 'Dorjee Khandu',
        phone: '+919876543210',
        email: 'dorjee@assam.gov.in',
        licenseNumber: 'AS-01-2019-7711',
        licenseExpiry: '2029-01-01',
        mountainExperienceYears: 7,
        dutyStatus: 'AVAILABLE',
        currentVehicleId: null,
        safetyScore: 95,
      },
      dispatcherAssam
    );
    sampleDriverId = driver.id;

    // 4. Establish Trip Bound to Version 1
    const trip = await createTripRecord(
      {
        vehicleId: vehicle.id,
        driverId: driver.id,
        routeVersionId: route.activeVersionId,
        stops: [
          { facilityId: 'fac-gau-hub', stopOrder: 1, stopType: 'PICKUP', plannedArrival: null, notes: 'Guwahati Base Hub' },
          { facilityId: 'fac-koh-camp', stopOrder: 2, stopType: 'DELIVERY', plannedArrival: null, notes: 'Kohima Forward Camp' },
        ],
      },
      dispatcherAssam
    );
    sampleTripId = trip.id;
  });

  // ---------------------------------------------------------------------------
  // 1. Meaningful Change Detection
  // ---------------------------------------------------------------------------
  describe('Meaningful Change Detection', () => {
    it('detects GPS off-route deviation when vehicle deviates > 500 meters from baseline', async () => {
      // Off-route coordinates (deviated several kilometers north of the corridor)
      const deviatedLocation = { lat: 26.50, lng: 92.50 };

      const detection = await detectReplanningTriggers(
        sampleTripId,
        deviatedLocation,
        dispatcherAssam
      );

      expect(detection.needsReplanning).toBe(true);
      expect(detection.detectedTrigger).toBe('GPS_DEVIATION');
      expect(detection.details).toContain('deviated');
    });

    it('detects forward road hazard within 10km proximity of vehicle coordinates', async () => {
      const vehicleLocation = { lat: 25.75, lng: 93.90 };
      const knownHazards = [
        {
          coordinates: { lat: 25.77, lng: 93.92 }, // ~3.1 km away
          type: 'LANDSLIDE_BLOCKAGE',
        },
      ];

      const detection = await detectReplanningTriggers(
        sampleTripId,
        vehicleLocation,
        dispatcherAssam,
        knownHazards
      );

      expect(detection.needsReplanning).toBe(true);
      expect(detection.detectedTrigger).toBe('ROAD_HAZARD_BLOCKAGE');
      expect(detection.details).toContain('LANDSLIDE_BLOCKAGE');
      expect(detection.suggestedAvoidCoordinates).toHaveLength(1);
    });

    it('does not trigger replanning when vehicle is on route and no hazards exist', async () => {
      // Coordinates right on the baseline route (Guwahati origin)
      const onRouteLocation = { lat: 26.14, lng: 91.73 };

      const detection = await detectReplanningTriggers(
        sampleTripId,
        onRouteLocation,
        dispatcherAssam,
        []
      );

      expect(detection.needsReplanning).toBe(false);
      expect(detection.detectedTrigger).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Proposal Synthesis & Zero Data Fabrication
  // ---------------------------------------------------------------------------
  describe('Proposal Synthesis & Non-Silent Mutation Invariant', () => {
    it('synthesizes alternative detour, computes metrics, and does NOT overwrite active trip', async () => {
      const proposal = await proposeReplanning(
        {
          trip_id: sampleTripId,
          trigger_type: 'ROAD_HAZARD_BLOCKAGE',
          trigger_source_id: 'haz-nh29-zubza-rockfall',
          current_location: { lat: 25.80, lng: 93.85 },
          avoid_coordinates: [{ lat: 25.75, lng: 93.95 }],
          reason: 'Rockfall blocking both highway lanes at Zubza Pass',
        },
        dispatcherAssam
      );

      expect(proposal.id).toMatch(/^replan-/);
      expect(proposal.tripId).toBe(sampleTripId);
      expect(proposal.triggerType).toBe('ROAD_HAZARD_BLOCKAGE');
      expect(proposal.status).toBe('PENDING_APPROVAL');
      expect(proposal.requiresHumanApproval).toBe(true);
      expect(proposal.approvalStatus).toBe('PENDING');

      // Impact Analysis verification
      expect(proposal.impactAnalysis.originalDistanceKm).toBeGreaterThan(0);
      expect(proposal.impactAnalysis.newDistanceKm).toBeGreaterThan(0);
      expect(proposal.impactAnalysis.safeHavensIdentified).toBeGreaterThan(0);
      expect(proposal.impactAnalysis.avoidedHazardsCount).toBe(1);

      // Constraint Validation
      expect(proposal.constraintValidation.isVehicleCompatible).toBe(true);
      expect(proposal.constraintValidation.violations).toHaveLength(0);

      // Cryptographic Provenance
      expect(proposal.provenance.recalculationEngine).toBe('OSRM_TERRAIN_AWARE_2.0');
      expect(proposal.provenance.hash).toHaveLength(64);

      // INVARIANT CHECK: Active Trip routeVersionId must remain completely UNCHANGED prior to approval!
      const currentTrip = await (await import('@/lib/services/trip.service')).getTripById(sampleTripId, dispatcherAssam);
      expect(currentTrip.routeVersionId).toBe(proposal.currentRouteVersionId);
      expect(currentTrip.routeVersionId).not.toBe(proposal.candidateRouteVersionId);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Approval Workflow & Route Version N+1 Commit
  // ---------------------------------------------------------------------------
  describe('Human Approval & Route Version Commitment', () => {
    it('commits Version N+1 to route corridor and updates active trip upon dispatcher approval', async () => {
      const proposal = await proposeReplanning(
        {
          trip_id: sampleTripId,
          trigger_type: 'ROAD_HAZARD_BLOCKAGE',
          current_location: { lat: 25.80, lng: 93.85 },
          avoid_coordinates: [{ lat: 25.75, lng: 93.95 }],
        },
        dispatcherAssam
      );

      expect(proposal.status).toBe('PENDING_APPROVAL');

      // Dispatcher approves the replanning detour
      const approved = await approveReplanning(
        proposal.id,
        'Detour cleared with local highway police control',
        dispatcherAssam,
        true // applyImmediately
      );

      expect(approved.status).toBe('APPLIED');
      expect(approved.approvalStatus).toBe('APPROVED');
      expect(approved.approvalMetadata?.approvedBy).toBe(dispatcherAssam.id);
      expect(approved.candidateRouteVersionId).toBeDefined();

      // Verify Parent Route now has Version 2
      const parentRoute = await getRouteById(sampleRouteId, dispatcherAssam);
      expect(parentRoute.versions.length).toBe(2);
      const v2 = parentRoute.versions.find((v) => v.versionNumber === 2);
      expect(v2).toBeDefined();
      expect(v2?.changeReason).toContain('Replanning detour');

      // Verify Active Trip is now updated to Version 2
      const updatedTrip = await (await import('@/lib/services/trip.service')).getTripById(sampleTripId, dispatcherAssam);
      expect(updatedTrip.routeVersionId).toBe(approved.candidateRouteVersionId);
    });

    it('supports idempotent re-approval without duplicating route versions', async () => {
      const proposal = await proposeReplanning(
        {
          trip_id: sampleTripId,
          trigger_type: 'ROAD_HAZARD_BLOCKAGE',
        },
        dispatcherAssam
      );

      await approveReplanning(proposal.id, 'First approval', dispatcherAssam);
      const reApproved = await approveReplanning(proposal.id, 'Duplicate click', dispatcherAssam);

      expect(reApproved.approvalStatus).toBe('APPROVED');
      const parentRoute = await getRouteById(sampleRouteId, dispatcherAssam);
      expect(parentRoute.versions.length).toBe(2); // Still exactly 2 versions
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Rejection Workflow
  // ---------------------------------------------------------------------------
  describe('Rejection Workflow & Route Integrity', () => {
    it('marks proposal REJECTED and leaves active trip and route version intact', async () => {
      const proposal = await proposeReplanning(
        {
          trip_id: sampleTripId,
          trigger_type: 'GPS_DEVIATION',
          reason: 'Driver diverted into unauthorized logging trail',
        },
        dispatcherAssam
      );

      const rejected = await rejectReplanning(
        proposal.id,
        'Unauthorized trail deemed unsafe; driver instructed to turn back to highway',
        dispatcherAssam
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.approvalStatus).toBe('REJECTED');
      expect(rejected.approvalMetadata?.rejectionReason).toContain('Unauthorized trail deemed unsafe');

      // Route and Trip must remain at Version 1
      const parentRoute = await getRouteById(sampleRouteId, dispatcherAssam);
      expect(parentRoute.versions.length).toBe(1);

      const trip = await (await import('@/lib/services/trip.service')).getTripById(sampleTripId, dispatcherAssam);
      expect(trip.routeVersionId).toBe(proposal.currentRouteVersionId);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Constraint Validation & Failure Invariant
  // ---------------------------------------------------------------------------
  describe('Constraint Validation & Failure Diagnostics', () => {
    it('returns FAILED status with explicit diagnostics when route gradient exceeds vehicle chassis capability', async () => {
      // Create a weak low-clearance vehicle with very low gradient tolerance (5%)
      const weakVan = await createVehicle(
        {
          registrationNumber: 'AS-01-VN-1100',
          makeModel: 'City Van Light',
          type: 'LIGHT_VAN',
          payloadCapacityKg: 800,
          cargoVolumeM3: 3.5,
          maxGradientPct: 5, // Incapable of mountain pass
          maxWidthMeters: 1.8,
          waterCrossingDepthMm: 150,
          hasColdChain: false,
          fuelType: 'PETROL',
          fuelCapacityLiters: 50,
          currentFuelPct: 80,
          facilityId: null,
          currentLocation: null,
          assignedDriverId: null,
          lastTelemetryAt: null,
          status: 'AVAILABLE',
        },
        dispatcherAssam
      );

      // Create a trip with this weak vehicle
      const weakTrip = await createTripRecord(
        {
          vehicleId: weakVan.id,
          driverId: sampleDriverId,
          routeVersionId: (await getRouteById(sampleRouteId, dispatcherAssam)).activeVersionId,
        },
        dispatcherAssam
      );

      const proposal = await proposeReplanning(
        {
          trip_id: weakTrip.id,
          trigger_type: 'ROAD_HAZARD_BLOCKAGE',
          current_location: { lat: 25.80, lng: 93.85 },
        },
        dispatcherAssam
      );

      expect(proposal.status).toBe('FAILED');
      expect(proposal.constraintValidation.isVehicleCompatible).toBe(false);
      expect(proposal.constraintValidation.violations.length).toBeGreaterThan(0);
      expect(proposal.constraintValidation.violations.some((v) => v.includes('gradient'))).toBe(true);

      // Invariant: Failed proposal cannot be approved
      await expect(
        approveReplanning(proposal.id, 'Attempting approval on impossible route', dispatcherAssam)
      ).rejects.toThrow("Cannot approve proposal in 'FAILED' state");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Tenancy & Query Isolation
  // ---------------------------------------------------------------------------
  describe('Multi-Tenancy & Query Isolation', () => {
    it('prevents cross-tenant viewing or approval of replanning proposals', async () => {
      const assamProposal = await proposeReplanning(
        {
          trip_id: sampleTripId,
          trigger_type: 'ROAD_HAZARD_BLOCKAGE',
        },
        dispatcherAssam
      );

      // Nagaland Admin queries proposals
      const nagalandList = await listReplanningProposals({}, adminNagaland);
      expect(nagalandList.proposals.some((p) => p.id === assamProposal.id)).toBe(false);

      // Cross-tenant direct access blocked
      await expect(getReplanningProposalById(assamProposal.id, adminNagaland)).rejects.toThrow(
        'Access denied: Proposal belongs to another organization'
      );

      // Cross-tenant approval attempt blocked
      await expect(
        approveReplanning(assamProposal.id, 'Unauthorized external approval', adminNagaland)
      ).rejects.toThrow('Access denied: Proposal belongs to another organization');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. REST API Endpoints & RBAC Protection
  // ---------------------------------------------------------------------------
  describe('REST API Endpoints & RBAC Protection', () => {
    it('POST /api/v1/replanning/evaluate returns 201 for authorized dispatcher', async () => {
      const req = createMockRequest('POST', '/api/v1/replanning/evaluate', dispatcherAssam, {
        trip_id: sampleTripId,
        trigger_type: 'ROAD_HAZARD_BLOCKAGE',
        reason: 'Monsoon mudslide reported by local checkpost',
      });

      const res = await postEvaluateRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.tripId).toBe(sampleTripId);
      expect(json.data.status).toBe('PENDING_APPROVAL');
    });

    it('POST /api/v1/replanning/evaluate returns 403 Forbidden for viewer role', async () => {
      const req = createMockRequest('POST', '/api/v1/replanning/evaluate', viewerAssam, {
        trip_id: sampleTripId,
        trigger_type: 'ROAD_HAZARD_BLOCKAGE',
      });

      const res = await postEvaluateRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/replanning/proposals returns 200 with paginated list', async () => {
      await proposeReplanning({ trip_id: sampleTripId, trigger_type: 'GPS_DEVIATION' }, dispatcherAssam);

      const req = createMockRequest('GET', `/api/v1/replanning/proposals?trip_id=${sampleTripId}`, dispatcherAssam);
      const res = await getProposalsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.proposals.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/replanning/proposals/[id] returns proposal details', async () => {
      const proposal = await proposeReplanning({ trip_id: sampleTripId, trigger_type: 'GPS_DEVIATION' }, dispatcherAssam);

      const req = createMockRequest('GET', `/api/v1/replanning/proposals/${proposal.id}`, dispatcherAssam);
      const res = await getProposalDetailRoute(req, { params: { id: proposal.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(proposal.id);
    });

    it('POST /api/v1/replanning/proposals/[id]/approve allows dispatcher sign-off', async () => {
      const proposal = await proposeReplanning({ trip_id: sampleTripId, trigger_type: 'ROAD_HAZARD_BLOCKAGE' }, dispatcherAssam);

      const req = createMockRequest('POST', `/api/v1/replanning/proposals/${proposal.id}/approve`, dispatcherAssam, {
        comments: 'Highway detour approved by emergency logistics control',
        apply_immediately: true,
      });

      const res = await postApproveRoute(req, { params: { id: proposal.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.approvalStatus).toBe('APPROVED');
      expect(json.data.status).toBe('APPLIED');
    });

    it('POST /api/v1/replanning/proposals/[id]/approve returns 403 for unauthorized viewer', async () => {
      const proposal = await proposeReplanning({ trip_id: sampleTripId, trigger_type: 'ROAD_HAZARD_BLOCKAGE' }, dispatcherAssam);

      const req = createMockRequest('POST', `/api/v1/replanning/proposals/${proposal.id}/approve`, viewerAssam, {
        comments: 'Attempted approval without clearance',
      });

      const res = await postApproveRoute(req, { params: { id: proposal.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/replanning/proposals/[id]/reject allows dispatcher rejection', async () => {
      const proposal = await proposeReplanning({ trip_id: sampleTripId, trigger_type: 'ROAD_HAZARD_BLOCKAGE' }, dispatcherAssam);

      const req = createMockRequest('POST', `/api/v1/replanning/proposals/${proposal.id}/reject`, dispatcherAssam, {
        rejection_reason: 'Southern valley pass also compromised by flooding',
      });

      const res = await postRejectRoute(req, { params: { id: proposal.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('REJECTED');
      expect(json.data.approvalStatus).toBe('REJECTED');
    });
  });
});
