/**
 * AuraNER / NER-Route AI — Phase 17: Optimization Engine Test Suite
 * 
 * Comprehensive tests verifying:
 * 1. Multi-Vehicle VRPTW / CVRP Mathematical Optimization (Feasible)
 * 2. Priority-Driven Cargo Fulfillment (CRITICAL disaster relief prioritized)
 * 3. Vehicle Multi-Dimensional Constraints (payload kg, volume m³)
 * 4. Cold-Chain Refrigeration Compliance (vaccines assigned only to refrigerated fleet)
 * 5. Mountain Gradient & Terrain Constraints (steep slope requires high-grade chassis)
 * 6. Driver Mountain Experience & Duty Status Constraints
 * 7. Time Window Propagation & Deadline Adherence
 * 8. Infeasibility Diagnostics & Zero-Fabrication Invariant (explicit violations, zero fake routes)
 * 9. Mandatory Human Approval Workflow (PENDING_APPROVAL -> APPROVED -> APPLIED)
 * 10. REST API Contracts & RBAC Gating (routes:calculate, shipments:dispatch, 403 for VIEWER)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { resetEnvCache } from '@/lib/env';
import {
  runOptimization,
  approveOptimizationRun,
  applyOptimizationRun,
  rejectOptimizationRun,
  listOptimizationRuns,
  getOptimizationRunById,
  _resetOptimizationStore,
} from '@/lib/services/optimization.service';
import { OptimizationInputPayload } from '@/lib/types/optimization';
import { POST as postOptimizationRunRoute } from '@/app/api/v1/optimization/run/route';
import { GET as getOptimizationRunsRoute } from '@/app/api/v1/optimization/runs/route';
import { GET as getOptimizationRunDetailRoute } from '@/app/api/v1/optimization/runs/[id]/route';
import { POST as postApproveRoute } from '@/app/api/v1/optimization/runs/[id]/approve/route';
import { POST as postApplyRoute } from '@/app/api/v1/optimization/runs/[id]/apply/route';
import { POST as postRejectRoute } from '@/app/api/v1/optimization/runs/[id]/reject/route';

// Test Actors
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

// Sample Test Fleet & Shipments
const sampleVehicles = [
  {
    id: 'veh-heavy-01',
    registration_number: 'AS-01-AX-9001',
    type: 'HEAVY_TRUCK',
    payload_capacity_kg: 9000,
    cargo_volume_m3: 30.0,
    max_gradient_pct: 18,
    max_width_meters: 2.6,
    water_crossing_depth_mm: 500,
    has_cold_chain: false,
    status: 'AVAILABLE',
  },
  {
    id: 'veh-cold-02',
    registration_number: 'AS-01-BX-4002',
    type: 'REFRIGERATED_TRUCK',
    payload_capacity_kg: 3500,
    cargo_volume_m3: 12.0,
    max_gradient_pct: 22,
    max_width_meters: 2.4,
    water_crossing_depth_mm: 400,
    has_cold_chain: true,
    status: 'AVAILABLE',
  },
  {
    id: 'veh-4x4-03',
    registration_number: 'AS-01-CX-2003',
    type: 'UTILITY_4X4',
    payload_capacity_kg: 1500,
    cargo_volume_m3: 6.0,
    max_gradient_pct: 38,
    max_width_meters: 2.0,
    water_crossing_depth_mm: 650,
    has_cold_chain: false,
    status: 'AVAILABLE',
  },
];

const sampleDrivers = [
  {
    id: 'drv-tenzing',
    name: 'Tenzing Norbu',
    duty_status: 'AVAILABLE',
    mountain_experience_years: 8,
    has_mountain_endorsement: true,
    max_daily_driving_hours: 10,
  },
  {
    id: 'drv-biren',
    name: 'Biren Das',
    duty_status: 'AVAILABLE',
    mountain_experience_years: 2,
    has_mountain_endorsement: false,
    max_daily_driving_hours: 8,
  },
];

describe('Phase 17: Optimization Engine Architecture', () => {
  beforeEach(() => {
    _resetOptimizationStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Feasible VRPTW / CVRP Multi-Vehicle Optimization
  // ---------------------------------------------------------------------------
  describe('1. Feasible VRPTW / CVRP Multi-Vehicle Optimization', () => {
    it('optimizes multi-stop cargo dispatch into valid vehicle routes with return to depot', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        depotCoordinates: { lat: 26.1445, lng: 91.7362 },
        vehicles: sampleVehicles as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-food-01',
            shipment_code: 'SHP-FOOD-01',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-tez-01',
            destination_coordinates: { lat: 26.6338, lng: 92.7926 },
            weight_kg: 2400,
            volume_m3: 8.0,
            priority: 'HIGH',
            requires_cold_chain: false,
          },
          {
            id: 'shp-pds-02',
            shipment_code: 'SHP-PDS-02',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-nag-01',
            destination_coordinates: { lat: 26.3464, lng: 92.6840 },
            weight_kg: 3200,
            volume_m3: 10.0,
            priority: 'MEDIUM',
            requires_cold_chain: false,
          },
        ] as any,
        primaryObjective: 'MINIMIZE_TRANSIT_DURATION',
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('OPTIMAL');
      expect(result.approvalStatus).toBe('PENDING_APPROVAL'); // Mandatory Human Approval Invariant
      expect(result.allocatedVehicleCount).toBeGreaterThanOrEqual(1);
      expect(result.unassignedRequestCount).toBe(0);
      expect(result.routes.length).toBeGreaterThanOrEqual(1);

      // Verify Itinerary Sequence: Depot -> Deliveries -> Depot
      const route = result.routes[0];
      expect(route.stops[0].stopType).toBe('DEPOT');
      expect(route.stops[0].facilityId).toBe('fac-gau-wh-01');
      expect(route.stops[route.stops.length - 1].stopType).toBe('DEPOT');
      expect(route.totalDistanceKm).toBeGreaterThan(0);
      expect(route.totalDurationMinutes).toBeGreaterThan(0);
      expect(route.payloadUtilizationPct).toBeGreaterThan(0);

      // Verify Provenance
      expect(result.provenance.engineVersion).toBe('2.0.0-PROD');
      expect(result.provenance.solverHash).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Priority-Driven Cargo Fulfillment
  // ---------------------------------------------------------------------------
  describe('2. Priority-Driven Cargo Fulfillment', () => {
    it('prioritizes CRITICAL emergency relief over LOW priority freight when capacity is constrained', async () => {
      // Constrained fleet: only 1 small vehicle with 1500kg capacity
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: [
          {
            id: 'veh-small',
            registration_number: 'AS-01-SMALL',
            type: 'LIGHT_VAN',
            payload_capacity_kg: 1500,
            cargo_volume_m3: 6.0,
            max_gradient_pct: 15,
            max_width_meters: 2.0,
            water_crossing_depth_mm: 300,
            has_cold_chain: false,
            status: 'AVAILABLE',
          },
        ] as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-low-prio',
            shipment_code: 'SHP-LOW',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-dest-1',
            weight_kg: 1200,
            volume_m3: 3.0,
            priority: 'LOW',
            requires_cold_chain: false,
          },
          {
            id: 'shp-crit-relief',
            shipment_code: 'SHP-CRIT',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-dest-2',
            weight_kg: 1400,
            volume_m3: 4.0,
            priority: 'CRITICAL',
            requires_cold_chain: false,
          },
        ] as any,
        allowPartialFulfillment: true,
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('FEASIBLE');
      expect(result.allocatedVehicleCount).toBe(1);
      expect(result.unassignedRequestCount).toBe(1);

      // The CRITICAL shipment must be assigned
      const assignedIds = result.routes[0].assignedShipmentIds;
      expect(assignedIds).toContain('shp-crit-relief');
      expect(assignedIds).not.toContain('shp-low-prio');

      // The LOW shipment must be listed in unassignedRequests
      expect(result.unassignedRequests[0].shipmentId).toBe('shp-low-prio');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Cold-Chain Refrigeration Compliance
  // ---------------------------------------------------------------------------
  describe('3. Cold-Chain Refrigeration Compliance', () => {
    it('routes refrigerated medical vaccines strictly to cold-chain equipped vehicles', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: sampleVehicles as any, // Includes veh-cold-02 (refrigerated) and veh-heavy-01 (non-refrigerated)
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-vaccine-cold',
            shipment_code: 'SHP-MED-VAC',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-hosp-shl',
            weight_kg: 1800,
            volume_m3: 5.0,
            priority: 'CRITICAL',
            requires_cold_chain: true,
            min_temperature_c: 2,
            max_temperature_c: 8,
          },
        ] as any,
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('OPTIMAL');
      expect(result.routes.length).toBe(1);
      // Must be assigned to veh-cold-02
      expect(result.routes[0].vehicleId).toBe('veh-cold-02');
      expect(result.routes[0].assignedShipmentIds).toContain('shp-vaccine-cold');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Mountain Terrain & Gradient Constraints
  // ---------------------------------------------------------------------------
  describe('4. Mountain Terrain & Gradient Constraints', () => {
    it('restricts steep mountain sectors (>25% slope) to high-gradient vehicles and experienced drivers', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: sampleVehicles as any, // veh-4x4-03 has 38% max gradient; heavy truck has 18%
        drivers: sampleDrivers as any,    // Tenzing has 8 years mountain exp; Biren has 2 years
        shipments: [
          {
            id: 'shp-hill-climb',
            shipment_code: 'SHP-HILL-CLIMB',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-tawang-camp',
            weight_kg: 1100,
            volume_m3: 4.0,
            priority: 'HIGH',
            requires_cold_chain: false,
            max_gradient_tolerance_pct: 30, // 30% steep pass requires 4x4
          },
        ] as any,
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('OPTIMAL');
      // Must allocate the 4x4 utility vehicle capable of 38% gradient
      expect(result.routes[0].vehicleId).toBe('veh-4x4-03');
      expect(result.routes[0].driverId).toBe('drv-tenzing'); // Tenzing has >=3 years experience
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Time Window Propagation & Delivery Deadlines
  // ---------------------------------------------------------------------------
  describe('5. Time Window Propagation & Delivery Deadlines', () => {
    it('propagates arrival and service times across stops and detects impossible time windows', async () => {
      const pastDeadline = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour in the past!

      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: sampleVehicles as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-expired-tw',
            shipment_code: 'SHP-EXP-TW',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-tez-01',
            destination_coordinates: { lat: 26.63, lng: 92.79 },
            weight_kg: 500,
            volume_m3: 2.0,
            priority: 'HIGH',
            requires_cold_chain: false,
            time_window: {
              latest_delivery_iso: pastDeadline,
              service_duration_minutes: 25,
            },
          },
        ] as any,
      };

      const result = await runOptimization(payload, dispatcherAssam);

      // Route generated, but time window violation recorded
      expect(result.violations.some((v) => v.constraint === 'TIME_WINDOW_VIOLATED')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Infeasibility Scenarios & Zero-Fabrication Invariant
  // ---------------------------------------------------------------------------
  describe('6. Infeasibility Scenarios & Zero-Fabrication Invariant', () => {
    it('returns INFEASIBLE with explicit violation diagnostics when zero operational fleet is available', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: [], // Zero vehicles!
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-stranded',
            shipment_code: 'SHP-STRANDED',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-dest',
            weight_kg: 1000,
            volume_m3: 3.0,
            priority: 'HIGH',
            requires_cold_chain: false,
          },
        ] as any,
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('INFEASIBLE');
      expect(result.allocatedVehicleCount).toBe(0);
      expect(result.routes).toHaveLength(0); // Zero fabricated routes!
      expect(result.violations.some((v) => v.constraint === 'VEHICLE_UNAVAILABLE')).toBe(true);
      expect(result.unassignedRequests).toHaveLength(1);
    });

    it('returns INFEASIBLE when total cargo weight exceeds total fleet capacity and partial fulfillment is false', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: [
          {
            id: 'veh-micro',
            registration_number: 'AS-01-MICRO',
            type: 'LIGHT_VAN',
            payload_capacity_kg: 1000, // Only 1,000kg
            cargo_volume_m3: 4.0,
            max_gradient_pct: 15,
            max_width_meters: 2.0,
            water_crossing_depth_mm: 300,
            has_cold_chain: false,
            status: 'AVAILABLE',
          },
        ] as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-heavy-cargo',
            shipment_code: 'SHP-HEAVY-CARGO',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-dest',
            weight_kg: 5000, // 5,000kg demand vs 1,000kg fleet capacity!
            volume_m3: 15.0,
            priority: 'CRITICAL',
            requires_cold_chain: false,
          },
        ] as any,
        allowPartialFulfillment: false, // Strict: all or nothing
      };

      const result = await runOptimization(payload, dispatcherAssam);

      expect(result.status).toBe('INFEASIBLE');
      expect(result.allocatedVehicleCount).toBe(0);
      expect(result.violations.some((v) => v.constraint === 'PAYLOAD_CAPACITY_EXCEEDED')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Mandatory Human Approval Workflow
  // ---------------------------------------------------------------------------
  describe('7. Mandatory Human Approval Workflow', () => {
    it('enforces PENDING_APPROVAL -> APPROVED -> APPLIED lifecycle and prevents unapproved execution', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: sampleVehicles as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-approval-test',
            shipment_code: 'SHP-APP-01',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-shl-01',
            weight_kg: 1500,
            volume_m3: 5.0,
            priority: 'HIGH',
            requires_cold_chain: false,
          },
        ] as any,
      };

      const run = await runOptimization(payload, dispatcherAssam);
      expect(run.approvalStatus).toBe('PENDING_APPROVAL');

      // Attempting to apply unapproved run must fail
      await expect(
        applyOptimizationRun(run.id, { createTrips: true, assignShipments: true }, dispatcherAssam)
      ).rejects.toThrow(/must be explicitly APPROVED/);

      // Approve run
      const approved = await approveOptimizationRun(run.id, 'Approved for evening dispatch by Pranab', dispatcherAssam);
      expect(approved.approvalStatus).toBe('APPROVED');
      expect(approved.provenance.approvedBy).toBe(dispatcherAssam.id);
      expect(approved.provenance.approvedAt).toBeDefined();

      // Now apply run
      const appliedResult = await applyOptimizationRun(run.id, { createTrips: true, assignShipments: true }, dispatcherAssam);
      expect(appliedResult.run.approvalStatus).toBe('APPLIED');
      expect(appliedResult.createdTripIds.length).toBeGreaterThan(0);
    });

    it('allows a dispatcher to explicitly reject an optimization plan', async () => {
      const payload: OptimizationInputPayload = {
        depotFacilityId: 'fac-gau-wh-01',
        vehicles: sampleVehicles as any,
        drivers: sampleDrivers as any,
        shipments: [
          {
            id: 'shp-reject-test',
            shipment_code: 'SHP-REJ-01',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-tez-01',
            weight_kg: 1000,
            volume_m3: 3.0,
            priority: 'MEDIUM',
            requires_cold_chain: false,
          },
        ] as any,
      };

      const run = await runOptimization(payload, dispatcherAssam);
      const rejected = await rejectOptimizationRun(run.id, 'Postponing dispatch due to incoming thunderstorm warning', dispatcherAssam);

      expect(rejected.approvalStatus).toBe('REJECTED');
      expect(rejected.provenance.rejectionReason).toContain('thunderstorm warning');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. REST API Endpoints & RBAC Authorization
  // ---------------------------------------------------------------------------
  describe('8. REST API Endpoints & RBAC Authorization', () => {
    it('POST /api/v1/optimization/run allows DISPATCHER (201) and denies VIEWER (403)', async () => {
      const body = {
        depot_facility_id: 'fac-gau-wh-01',
        shipments: [
          {
            id: 'shp-api-test',
            origin_facility_id: 'fac-gau-wh-01',
            destination_facility_id: 'fac-sil-01',
            weight_kg: 1200,
            priority: 'HIGH',
          },
        ],
        vehicles: sampleVehicles,
        drivers: sampleDrivers,
      };

      // VIEWER should be denied (403)
      const viewerReq = createMockRequest('POST', '/api/v1/optimization/run', viewerAssam, body);
      const viewerRes = await postOptimizationRunRoute(viewerReq);
      expect(viewerRes.status).toBe(403);

      // DISPATCHER should succeed (201)
      const dispatcherReq = createMockRequest('POST', '/api/v1/optimization/run', dispatcherAssam, body);
      const dispatcherRes = await postOptimizationRunRoute(dispatcherReq);
      expect(dispatcherRes.status).toBe(201);

      const json = await dispatcherRes.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.status).toBe('OPTIMAL');
    });

    it('GET /api/v1/optimization/runs and GET /api/v1/optimization/runs/[id] retrieve records', async () => {
      // Seed a run
      const run = await runOptimization(
        {
          depotFacilityId: 'fac-gau-wh-01',
          vehicles: sampleVehicles as any,
          drivers: sampleDrivers as any,
          shipments: [
            {
              id: 'shp-get-test',
              originFacilityId: 'fac-gau-wh-01',
              destinationFacilityId: 'fac-dest',
              weightKg: 1000,
              volumeM3: 3.0,
              priority: 'MEDIUM',
              requiresColdChain: false,
            },
          ],
        },
        dispatcherAssam
      );

      // Query runs list
      const listReq = createMockRequest('GET', '/api/v1/optimization/runs', dispatcherAssam);
      const listRes = await getOptimizationRunsRoute(listReq);
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.data.total).toBeGreaterThanOrEqual(1);

      // Query single run
      const getReq = createMockRequest('GET', `/api/v1/optimization/runs/${run.id}`, dispatcherAssam);
      const getRes = await getOptimizationRunDetailRoute(getReq, { params: { id: run.id } });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.id).toBe(run.id);
    });

    it('POST /api/v1/optimization/runs/[id]/approve and apply enforces RBAC', async () => {
      const run = await runOptimization(
        {
          depotFacilityId: 'fac-gau-wh-01',
          vehicles: sampleVehicles as any,
          drivers: sampleDrivers as any,
          shipments: [
            {
              id: 'shp-api-flow',
              originFacilityId: 'fac-gau-wh-01',
              destinationFacilityId: 'fac-dest',
              weightKg: 800,
              volumeM3: 2.5,
              priority: 'HIGH',
              requiresColdChain: false,
            },
          ],
        },
        dispatcherAssam
      );

      // VIEWER cannot approve
      const viewerApproveReq = createMockRequest('POST', `/api/v1/optimization/runs/${run.id}/approve`, viewerAssam, { comments: 'Looks good' });
      const viewerApproveRes = await postApproveRoute(viewerApproveReq, { params: { id: run.id } });
      expect(viewerApproveRes.status).toBe(403);

      // DISPATCHER approves
      const dispApproveReq = createMockRequest('POST', `/api/v1/optimization/runs/${run.id}/approve`, dispatcherAssam, { comments: 'Approved by dispatch' });
      const dispApproveRes = await postApproveRoute(dispApproveReq, { params: { id: run.id } });
      expect(dispApproveRes.status).toBe(200);

      // DISPATCHER applies
      const dispApplyReq = createMockRequest('POST', `/api/v1/optimization/runs/${run.id}/apply`, dispatcherAssam, { create_trips: true });
      const dispApplyRes = await postApplyRoute(dispApplyReq, { params: { id: run.id } });
      expect(dispApplyRes.status).toBe(200);
      const applyJson = await dispApplyRes.json();
      expect(applyJson.data.run.approvalStatus).toBe('APPLIED');
    });

    it('throws NotFoundError in production mode when candidate shipment/vehicle/driver ID is missing (zero-fabrication)', async () => {
      const origEnv = process.env.ALLOW_MOCK_PROVIDERS;
      try {
        process.env.ALLOW_MOCK_PROVIDERS = 'false';
        resetEnvCache();
        await expect(
          runOptimization(
            {
              depotFacilityId: 'fac-gau-wh-01',
              shipmentIds: ['shp-non-existent-999'],
            },
            dispatcherAssam
          )
        ).rejects.toThrow(/Candidate shipment with ID 'shp-non-existent-999' not found/);
      } finally {
        process.env.ALLOW_MOCK_PROVIDERS = origEnv;
        resetEnvCache();
      }
    });
  });
});
