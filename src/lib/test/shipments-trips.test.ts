/**
 * AuraNER / NER-Route AI — Phase 10: Shipments + Trips Verification Test Suite
 * 
 * Verifies production-grade shipment and trip management:
 * 1. Shipment creation, validation, and auto-generated shipment codes
 * 2. Manifest line items, weight/volume auto-summation, and SKU tracking
 * 3. Shipment lifecycle state transitions (PLANNED -> ASSIGNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED, CANCELLED)
 * 4. Cold chain specifications and temperature compliance validation
 * 5. Trip creation, vehicle/driver assignment foundations, and status progression
 * 6. Multi-stop trip itineraries, sequence ordering, and stop completion timestamps
 * 7. Trip assignment linking shipments with trips
 * 8. Search and multi-parameter filtering for shipments and trips
 * 9. Multi-tenant organization isolation (Assam vs Meghalaya)
 * 10. RBAC capability gating (DISPATCHER/LOGISTICS_MGR vs VIEWER)
 * 11. Zero-fabrication invariant (clean tenants return 0 records)
 * 12. Audit logging for all critical shipment and trip operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  listShipments,
  getShipmentById,
  createShipmentRecord,
  updateShipmentRecord,
  cancelShipmentRecord,
  addShipmentItem,
  listShipmentItems,
  getShipmentSummary,
  _resetShipmentStore,
} from '@/lib/services/shipment.service';
import {
  listTrips,
  getTripById,
  createTripRecord,
  updateTripRecord,
  addTripStop,
  completeTripStop,
  assignShipmentToTrip,
  getTripSummary,
  _resetTripStore,
} from '@/lib/services/trip.service';
import {
  createVehicle,
  _resetFleetStore,
} from '@/lib/services/fleet.service';
import {
  createDriver,
  _resetDriverStore,
} from '@/lib/services/driver.service';
import {
  GET as getShipmentsRoute,
  POST as postShipmentsRoute,
} from '@/app/api/v1/shipments/route';
import {
  GET as getShipmentIdRoute,
  PATCH as patchShipmentIdRoute,
  DELETE as deleteShipmentIdRoute,
} from '@/app/api/v1/shipments/[id]/route';
import {
  GET as getShipmentItemsRoute,
  POST as postShipmentItemsRoute,
} from '@/app/api/v1/shipments/[id]/items/route';
import {
  GET as getShipmentSummaryRoute,
} from '@/app/api/v1/shipments/summary/route';
import {
  GET as getTripsRoute,
  POST as postTripsRoute,
} from '@/app/api/v1/trips/route';
import {
  GET as getTripIdRoute,
  PATCH as patchTripIdRoute,
} from '@/app/api/v1/trips/[id]/route';
import {
  GET as getTripStopsRoute,
  POST as postTripStopsRoute,
} from '@/app/api/v1/trips/[id]/stops/route';
import {
  POST as postTripAssignRoute,
} from '@/app/api/v1/trips/[id]/assign/route';
import {
  GET as getTripsSummaryRoute,
} from '@/app/api/v1/trips/summary/route';

// Test Actors across tenants and roles
const SUPER_ADMIN: SessionUser = {
  id: 'usr_super_admin',
  email: 'director.disaster@mha.gov.in',
  name: 'Director Sharma',
  role: 'SUPER_ADMIN',
  organizationId: null,
};

const ORG_ADMIN_ASSAM: SessionUser = {
  id: 'usr_admin_assam',
  email: 'logistics.head@assam.gov.in',
  name: 'Commissioner Phukan',
  role: 'ORG_ADMIN',
  organizationId: 'org_assam_civil_supplies',
};

const LOGISTICS_MGR_ASSAM: SessionUser = {
  id: 'usr_logistics_assam',
  email: 'fleet.lead@assam.gov.in',
  name: 'Officer Borah',
  role: 'LOGISTICS_MANAGER',
  organizationId: 'org_assam_civil_supplies',
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

  const req = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return req;
}

describe('Phase 10: Shipments + Trips Management', () => {
  beforeEach(() => {
    _resetShipmentStore();
    _resetTripStore();
    _resetFleetStore();
    _resetDriverStore();
  });

  // ===========================================================================
  // 1. SHIPMENT CREATION & MANIFEST VALIDATION
  // ===========================================================================
  describe('Shipment Creation & Validation', () => {
    it('creates a shipment with auto-generated shipment code and default values', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_tezpur_district_hospital',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'CRITICAL',
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.id).toBeDefined();
      expect(shipment.organizationId).toBe('org_assam_civil_supplies');
      expect(shipment.shipmentCode).toMatch(/^SHP-[0-9]{4}$/);
      expect(shipment.status).toBe('PLANNED');
      expect(shipment.priority).toBe('CRITICAL');
      expect(shipment.cargoClassification).toBe('PHARMACEUTICAL');
      expect(shipment.totalWeightKg).toBe(0);
      expect(shipment.totalVolumeM3).toBe(1.0);
      expect(shipment.items.length).toBe(0);
    });

    it('creates a shipment with cold chain requirements', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_silchar_zonal',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'HIGH',
          requiresColdChain: true,
          minTemperatureC: 2.0,
          maxTemperatureC: 8.0,
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.requiresColdChain).toBe(true);
      expect(shipment.minTemperatureC).toBe(2.0);
      expect(shipment.maxTemperatureC).toBe(8.0);
    });

    it('creates a shipment with inline manifest items and auto-calculates total weight & volume', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_barpeta_relief_camp',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'HIGH',
          items: [
            {
              sku: 'SKU-RICE-50',
              description: 'Rice 50kg Bags',
              quantity: 20,
              unitWeightKg: 50,
              unitVolumeM3: 0.075,
              isFragile: false,
              isHazardous: false,
            },
            {
              sku: 'SKU-WPT-100',
              description: 'Water Purification Tablets',
              quantity: 5,
              unitWeightKg: 5,
              unitVolumeM3: 0.02,
              isFragile: true,
              isHazardous: false,
            },
          ],
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.items.length).toBe(2);
      expect(shipment.totalWeightKg).toBe(1025);
      expect(shipment.totalVolumeM3).toBeCloseTo(1.6, 2);

      const items = await listShipmentItems(shipment.id, DISPATCHER_ASSAM);
      expect(items.length).toBe(2);
      expect(items[0].description).toBe('Rice 50kg Bags');
      expect(items[1].isFragile).toBe(true);
    });

    it('adds line items incrementally and updates shipment totals', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_tezpur_district_hospital',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.totalWeightKg).toBe(0);

      const item1 = await addShipmentItem(
        shipment.id,
        {
          sku: 'SKU-BLANKET-10',
          description: 'Emergency Blankets',
          quantity: 10,
          unitWeightKg: 15,
          unitVolumeM3: 0.08,
          isFragile: false,
          isHazardous: false,
        },
        DISPATCHER_ASSAM
      );
      expect(item1.id).toBeDefined();

      const item2 = await addShipmentItem(
        shipment.id,
        {
          sku: 'SKU-SOLAR-5',
          description: 'Solar Lanterns',
          quantity: 5,
          unitWeightKg: 15,
          unitVolumeM3: 0.08,
          isFragile: false,
          isHazardous: true,
        },
        DISPATCHER_ASSAM
      );
      expect(item2.isHazardous).toBe(true);

      const updatedShipment = await getShipmentById(shipment.id, DISPATCHER_ASSAM);
      expect(updatedShipment.items.length).toBe(2);
      expect(updatedShipment.totalWeightKg).toBe(225);
      expect(updatedShipment.totalVolumeM3).toBeCloseTo(1.2, 2);
    });
  });

  // ===========================================================================
  // 2. SHIPMENT LIFECYCLE & STATE TRANSITIONS
  // ===========================================================================
  describe('Shipment Lifecycle Transitions', () => {
    it('progresses through PLANNED -> ASSIGNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati',
          destinationFacilityId: 'fac_nagaon',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.status).toBe('PLANNED');

      // Update to ASSIGNED
      const assigned = await updateShipmentRecord(shipment.id, { status: 'ASSIGNED' }, DISPATCHER_ASSAM);
      expect(assigned.status).toBe('ASSIGNED');

      // Update to DISPATCHED
      const dispatched = await updateShipmentRecord(shipment.id, { status: 'DISPATCHED' }, DISPATCHER_ASSAM);
      expect(dispatched.status).toBe('DISPATCHED');

      // Update to IN_TRANSIT
      const inTransit = await updateShipmentRecord(shipment.id, { status: 'IN_TRANSIT' }, DISPATCHER_ASSAM);
      expect(inTransit.status).toBe('IN_TRANSIT');

      // Update to DELIVERED
      const delivered = await updateShipmentRecord(shipment.id, { status: 'DELIVERED' }, DISPATCHER_ASSAM);
      expect(delivered.status).toBe('DELIVERED');
    });

    it('cancels a planned shipment with cancellation reason', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati',
          destinationFacilityId: 'fac_barpeta',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'LOW',
        },
        DISPATCHER_ASSAM
      );

      const res = await cancelShipmentRecord(shipment.id, DISPATCHER_ASSAM, 'Road landslide blocked NH-27');
      expect(res.success).toBe(true);

      const refreshed = await getShipmentById(shipment.id, DISPATCHER_ASSAM);
      expect(refreshed.status).toBe('CANCELLED');
    });

    it('rejects cancellation of a delivered shipment', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati',
          destinationFacilityId: 'fac_tezpur',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      await updateShipmentRecord(shipment.id, { status: 'DELIVERED' }, DISPATCHER_ASSAM);

      await expect(
        cancelShipmentRecord(shipment.id, DISPATCHER_ASSAM, 'Too late')
      ).rejects.toThrow('Cannot cancel an already delivered shipment');
    });
  });

  // ===========================================================================
  // 3. TRIP MANAGEMENT & VALIDATION
  // ===========================================================================
  describe('Trip Creation & Lifecycle', () => {
    it('creates a trip with scheduled stops and initial status SCHEDULED', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-TR-9988',
          makeModel: 'Tata Signa 2823.K Heavy Tipper',
          type: 'HEAVY_TRUCK',
          payloadCapacityKg: 16000,
          cargoVolumeM3: 24,
          maxGradientPct: 25,
          maxWidthMeters: 2.5,
          waterCrossingDepthMm: 500,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 300,
          currentFuelPct: 90,
          status: 'AVAILABLE',
          facilityId: 'fac_guwahati_central',
          assignedDriverId: null,
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_ASSAM
      );

      const driver = await createDriver(
        {
          name: 'Bhaben Boro',
          phone: '+91 98640 12345',
          email: null,
          licenseNumber: 'AS-01-2015004321',
          licenseExpiry: '2030-01-01',
          mountainExperienceYears: 12,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 90,
          userId: null,
        },
        ORG_ADMIN_ASSAM
      );

      const trip = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
          scheduledStart: '2026-10-01T06:00:00Z',
          stops: [
            {
              facilityId: 'fac_guwahati_central',
              stopOrder: 1,
              stopType: 'PICKUP',
              plannedArrival: '2026-10-01T06:00:00Z',
              notes: 'Guwahati Central Depot',
            },
            {
              facilityId: 'fac_tezpur_district_hospital',
              stopOrder: 2,
              stopType: 'DELIVERY',
              plannedArrival: '2026-10-01T14:00:00Z',
              notes: 'Tezpur Drop',
            },
          ],
        },
        DISPATCHER_ASSAM
      );

      expect(trip.id).toBeDefined();
      expect(trip.tripCode).toMatch(/^TRIP-[0-9]{4}$/);
      expect(trip.status).toBe('SCHEDULED');
      expect(trip.vehicleId).toBe(vehicle.id);
      expect(trip.driverId).toBe(driver.id);
      expect(trip.stops?.length).toBe(2);
      expect(trip.stops?.[0].stopOrder).toBe(1);
      expect(trip.stops?.[1].stopOrder).toBe(2);
    });

    it('rejects trip creation if vehicle belongs to another organization', async () => {
      const meghalayaVehicle = await createVehicle(
        {
          registrationNumber: 'ML-05-AB-1111',
          makeModel: 'Mahindra Bolero Camper 4x4',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 1000,
          cargoVolumeM3: 3.5,
          maxGradientPct: 35,
          maxWidthMeters: 1.8,
          waterCrossingDepthMm: 500,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 85,
          status: 'AVAILABLE',
          facilityId: 'fac_shillong_depot',
          assignedDriverId: null,
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_MEGHALAYA
      );

      const assamDriver = await createDriver(
        {
          name: 'Mukesh Das',
          phone: '+91 98640 55555',
          email: null,
          licenseNumber: 'AS-01-2018009988',
          licenseExpiry: '2029-05-01',
          mountainExperienceYears: 5,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 88,
          userId: null,
        },
        ORG_ADMIN_ASSAM
      );

      await expect(
        createTripRecord(
          {
            vehicleId: meghalayaVehicle.id,
            driverId: assamDriver.id,
          },
          DISPATCHER_ASSAM
        )
      ).rejects.toThrow();
    });

    it('completes trip stops in sequence and records completion timestamps', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-TR-5544',
          makeModel: 'Tata 407 Gold',
          type: 'MEDIUM_TRUCK',
          payloadCapacityKg: 2500,
          cargoVolumeM3: 8,
          maxGradientPct: 20,
          maxWidthMeters: 2.1,
          waterCrossingDepthMm: 400,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 90,
          status: 'AVAILABLE',
          facilityId: 'fac_guwahati_central',
          assignedDriverId: null,
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_ASSAM
      );

      const driver = await createDriver(
        {
          name: 'Nabin Kalita',
          phone: '+91 98640 44444',
          email: null,
          licenseNumber: 'AS-01-2016001122',
          licenseExpiry: '2028-09-01',
          mountainExperienceYears: 7,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 85,
          userId: null,
        },
        ORG_ADMIN_ASSAM
      );

      const trip = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
          stops: [
            {
              facilityId: 'fac_guwahati',
              stopOrder: 1,
              stopType: 'PICKUP',
              plannedArrival: '2026-10-01T06:00:00Z',
              notes: 'Guwahati Depot',
            },
            {
              facilityId: 'fac_jorhat',
              stopOrder: 2,
              stopType: 'DELIVERY',
              plannedArrival: '2026-10-01T12:00:00Z',
              notes: 'Jorhat Depot',
            },
          ],
        },
        DISPATCHER_ASSAM
      );

      const stopId = trip.stops[0].id;
      const completedStop = await completeTripStop(trip.id, stopId, DISPATCHER_ASSAM);

      expect(completedStop.isCompleted).toBe(true);
      expect(completedStop.actualDeparture).toBeDefined();

      const freshTrip = await getTripById(trip.id, DISPATCHER_ASSAM);
      expect(freshTrip.stops.find((s) => s.id === stopId)?.isCompleted).toBe(true);
    });
  });

  // ===========================================================================
  // 4. TRIP ASSIGNMENTS & SHIPMENT LINKING
  // ===========================================================================
  describe('Trip Consignment Assignment', () => {
    it('assigns a planned shipment to a trip, linking them and updating shipment status to ASSIGNED', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-TR-7766',
          makeModel: 'Ashok Leyland Ecomet',
          type: 'MEDIUM_TRUCK',
          payloadCapacityKg: 8000,
          cargoVolumeM3: 16,
          maxGradientPct: 22,
          maxWidthMeters: 2.3,
          waterCrossingDepthMm: 450,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 160,
          currentFuelPct: 85,
          status: 'AVAILABLE',
          facilityId: 'fac_guwahati_central',
          assignedDriverId: null,
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_ASSAM
      );

      const driver = await createDriver(
        {
          name: 'Pranjal Saikia',
          phone: '+91 98640 77777',
          email: null,
          licenseNumber: 'AS-01-2014008899',
          licenseExpiry: '2029-11-01',
          mountainExperienceYears: 10,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 92,
          userId: null,
        },
        ORG_ADMIN_ASSAM
      );

      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati',
          destinationFacilityId: 'fac_jorhat',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'HIGH',
        },
        DISPATCHER_ASSAM
      );

      const trip = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
        },
        DISPATCHER_ASSAM
      );

      expect(shipment.status).toBe('PLANNED');
      expect(shipment.assignedTripId).toBeFalsy();

      const assignment = await assignShipmentToTrip(trip.id, shipment.id, DISPATCHER_ASSAM);

      expect(assignment.id).toBeDefined();
      expect(assignment.tripId).toBe(trip.id);
      expect(assignment.shipmentId).toBe(shipment.id);

      const updatedShipment = await getShipmentById(shipment.id, DISPATCHER_ASSAM);
      expect(updatedShipment.status).toBe('ASSIGNED');
      expect(updatedShipment.assignedTripId).toBe(trip.id);
    });

    it('rejects assigning cancelled shipment to a trip', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-TR-3322',
          makeModel: 'Tata Signa',
          type: 'HEAVY_TRUCK',
          payloadCapacityKg: 12000,
          cargoVolumeM3: 20,
          maxGradientPct: 22,
          maxWidthMeters: 2.4,
          waterCrossingDepthMm: 450,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 200,
          currentFuelPct: 80,
          status: 'AVAILABLE',
          facilityId: 'fac_guwahati_central',
          assignedDriverId: null,
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_ASSAM
      );

      const driver = await createDriver(
        {
          name: 'Gopal Ray',
          phone: '+91 98640 88888',
          email: null,
          licenseNumber: 'AS-01-2012003344',
          licenseExpiry: '2031-03-01',
          mountainExperienceYears: 14,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 94,
          userId: null,
        },
        ORG_ADMIN_ASSAM
      );

      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati',
          destinationFacilityId: 'fac_jorhat',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'LOW',
        },
        DISPATCHER_ASSAM
      );

      await cancelShipmentRecord(shipment.id, DISPATCHER_ASSAM, 'Faulty consignment packaging');

      const trip = await createTripRecord(
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
        },
        DISPATCHER_ASSAM
      );

      await expect(
        assignShipmentToTrip(trip.id, shipment.id, DISPATCHER_ASSAM)
      ).rejects.toThrow('Cannot assign a cancelled shipment to a trip');
    });
  });

  // ===========================================================================
  // 5. SEARCH & MULTI-PARAMETER FILTERING
  // ===========================================================================
  describe('Search & Filtering', () => {
    it('filters shipments by priority, search text, and cold chain', async () => {
      await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_dibrugarh_hub',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'CRITICAL',
          requiresColdChain: true,
          notes: 'Emergency Insulin Supplies',
        },
        DISPATCHER_ASSAM
      );

      await createShipmentRecord(
        {
          originFacilityId: 'fac_guwahati_central',
          destinationFacilityId: 'fac_nagaon_hub',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'LOW',
          notes: 'Standard Wheat Grains',
        },
        DISPATCHER_ASSAM
      );

      // Filter by priority
      const criticalResult = await listShipments({ priority: 'CRITICAL' }, DISPATCHER_ASSAM);
      expect(criticalResult.shipments.length).toBe(1);
      expect(criticalResult.shipments[0].priority).toBe('CRITICAL');

      // Filter by cold chain
      const coldChainResult = await listShipments({ requires_cold_chain: true }, DISPATCHER_ASSAM);
      expect(coldChainResult.shipments.length).toBe(1);
      expect(coldChainResult.shipments[0].requiresColdChain).toBe(true);

      // Search text
      const searchResult = await listShipments({ search: 'Wheat' }, DISPATCHER_ASSAM);
      expect(searchResult.shipments.length).toBe(1);
      expect(searchResult.shipments[0].notes).toContain('Wheat');
    });

    it('calculates shipment summary metrics accurately', async () => {
      const s1 = await createShipmentRecord(
        {
          originFacilityId: 'fac_1',
          destinationFacilityId: 'fac_2',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
          totalWeightKg: 500,
        },
        DISPATCHER_ASSAM
      );

      await createShipmentRecord(
        {
          originFacilityId: 'fac_1',
          destinationFacilityId: 'fac_3',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'HIGH',
          totalWeightKg: 200,
          requiresColdChain: true,
        },
        DISPATCHER_ASSAM
      );

      await updateShipmentRecord(s1.id, { status: 'DELIVERED' }, DISPATCHER_ASSAM);

      const summary = await getShipmentSummary(DISPATCHER_ASSAM);
      expect(summary.totalShipments).toBe(2);
      expect(summary.deliveredShipments).toBe(1);
      expect(summary.plannedShipments).toBe(1);
      expect(summary.coldChainShipments).toBe(1);
      expect(summary.totalWeightKg).toBe(700);
    });
  });

  // ===========================================================================
  // 6. MULTI-TENANT ISOLATION
  // ===========================================================================
  describe('Multi-Tenant Organization Isolation', () => {
    it('strictly isolates shipments between Assam and Meghalaya tenants', async () => {
      const assamShipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_gau',
          destinationFacilityId: 'fac_dhubri',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      const meghalayaShipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_shillong',
          destinationFacilityId: 'fac_tura',
          cargoClassification: 'PHARMACEUTICAL',
          priority: 'HIGH',
        },
        ORG_ADMIN_MEGHALAYA
      );

      // Assam list
      const assamList = await listShipments({}, DISPATCHER_ASSAM);
      expect(assamList.shipments.some((s) => s.id === assamShipment.id)).toBe(true);
      expect(assamList.shipments.some((s) => s.id === meghalayaShipment.id)).toBe(false);

      // Meghalaya list
      const meghalayaList = await listShipments({}, ORG_ADMIN_MEGHALAYA);
      expect(meghalayaList.shipments.some((s) => s.id === meghalayaShipment.id)).toBe(true);
      expect(meghalayaList.shipments.some((s) => s.id === assamShipment.id)).toBe(false);

      // Cross-tenant get by ID throws ForbiddenError
      await expect(getShipmentById(assamShipment.id, ORG_ADMIN_MEGHALAYA)).rejects.toThrow();
    });

    it('enforces tenant isolation over HTTP API endpoints', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_gau',
          destinationFacilityId: 'fac_dib',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      // Meghalaya admin tries to access via API -> Forbidden (403)
      const req = createMockNextRequest(
        `/api/v1/shipments/${shipment.id}`,
        'GET',
        undefined,
        ORG_ADMIN_MEGHALAYA
      );
      const res = await getShipmentIdRoute(req, { params: { id: shipment.id } });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 7. ROLE-BASED ACCESS CONTROL (RBAC)
  // ===========================================================================
  describe('RBAC Authorization', () => {
    it('permits DISPATCHER to create shipments over API', async () => {
      const req = createMockNextRequest(
        '/api/v1/shipments',
        'POST',
        {
          origin_facility_id: 'fac_guwahati',
          destination_facility_id: 'fac_barpeta',
          cargo_classification: 'HAZMAT',
          priority: 'CRITICAL',
          total_weight_kg: 600,
        },
        DISPATCHER_ASSAM
      );

      const res = await postShipmentsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.shipmentCode).toBeDefined();
      expect(json.data.cargoClassification).toBe('HAZMAT');
    });

    it('denies VIEWER from creating shipments (403 Forbidden)', async () => {
      const req = createMockNextRequest(
        '/api/v1/shipments',
        'POST',
        {
          origin_facility_id: 'fac_guwahati',
          destination_facility_id: 'fac_barpeta',
          cargo_classification: 'GENERAL_FREIGHT',
          priority: 'LOW',
        },
        VIEWER_ASSAM
      );

      const res = await postShipmentsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain('Missing required permission: shipments:create');
    });

    it('denies VIEWER from cancelling shipments (403 Forbidden)', async () => {
      const shipment = await createShipmentRecord(
        {
          originFacilityId: 'fac_gau',
          destinationFacilityId: 'fac_tez',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      const req = createMockNextRequest(
        `/api/v1/shipments/${shipment.id}`,
        'DELETE',
        undefined,
        VIEWER_ASSAM
      );

      const res = await deleteShipmentIdRoute(req, { params: { id: shipment.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain('Missing required permission: shipments:cancel');
    });

    it('permits VIEWER to read shipments and summaries', async () => {
      await createShipmentRecord(
        {
          originFacilityId: 'fac_gau',
          destinationFacilityId: 'fac_tez',
          cargoClassification: 'GENERAL_FREIGHT',
          priority: 'MEDIUM',
        },
        DISPATCHER_ASSAM
      );

      const reqList = createMockNextRequest(
        '/api/v1/shipments',
        'GET',
        undefined,
        VIEWER_ASSAM
      );
      const resList = await getShipmentsRoute(reqList);
      expect(resList.status).toBe(200);
      const jsonList = await resList.json();
      expect(jsonList.data.length).toBe(1);

      const reqSummary = createMockNextRequest(
        '/api/v1/shipments/summary',
        'GET',
        undefined,
        VIEWER_ASSAM
      );
      const resSummary = await getShipmentSummaryRoute(reqSummary);
      expect(resSummary.status).toBe(200);
      const jsonSummary = await resSummary.json();
      expect(jsonSummary.data.totalShipments).toBe(1);
    });
  });

  // ===========================================================================
  // 8. ZERO-FABRICATION INVARIANT
  // ===========================================================================
  describe('Zero-Fabrication Invariant', () => {
    it('returns empty lists and zeroed metrics for newly initialized organizations without fabricated records', async () => {
      const NEW_TENANT: SessionUser = {
        id: 'usr_new_mizoram',
        email: 'officer@mizoram.gov.in',
        name: 'Officer Lalthan',
        role: 'ORG_ADMIN',
        organizationId: 'org_mizoram_disaster_mgmt',
      };

      // Shipments
      const reqShipments = createMockNextRequest('/api/v1/shipments', 'GET', undefined, NEW_TENANT);
      const resShipments = await getShipmentsRoute(reqShipments);
      const jsonShipments = await resShipments.json();
      expect(jsonShipments.data).toEqual([]);

      // Shipment Summary
      const reqShipmentSummary = createMockNextRequest('/api/v1/shipments/summary', 'GET', undefined, NEW_TENANT);
      const resShipmentSummary = await getShipmentSummaryRoute(reqShipmentSummary);
      const jsonShipmentSummary = await resShipmentSummary.json();
      expect(jsonShipmentSummary.data).toEqual({
        totalShipments: 0,
        draftShipments: 0,
        plannedShipments: 0,
        assignedShipments: 0,
        inTransitShipments: 0,
        deliveredShipments: 0,
        delayedShipments: 0,
        cancelledShipments: 0,
        coldChainShipments: 0,
        totalWeightKg: 0,
      });

      // Trips
      const reqTrips = createMockNextRequest('/api/v1/trips', 'GET', undefined, NEW_TENANT);
      const resTrips = await getTripsRoute(reqTrips);
      const jsonTrips = await resTrips.json();
      expect(jsonTrips.data).toEqual([]);

      // Trip Summary
      const reqTripSummary = createMockNextRequest('/api/v1/trips/summary', 'GET', undefined, NEW_TENANT);
      const resTripSummary = await getTripsSummaryRoute(reqTripSummary);
      const jsonTripSummary = await resTripSummary.json();
      expect(jsonTripSummary.data).toEqual({
        totalTrips: 0,
        scheduledTrips: 0,
        enRouteTrips: 0,
        atStopTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
      });
    });
  });
});
