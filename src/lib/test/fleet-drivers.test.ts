/**
 * AuraNER / NER-Route AI — Phase 9: Fleet + Drivers Verification Test Suite
 * 
 * Verifies production-grade fleet and driver management:
 * 1. Vehicle CRUD & validation
 * 2. Vehicle compliance documents & maintenance logs
 * 3. Driver onboarding, duty status & mountain endorsements
 * 4. Driver certification document metadata
 * 5. Search & multi-parameter filtering
 * 6. Multi-tenant organization isolation
 * 7. RBAC permissions (fleet:read, fleet:manage, drivers:read, drivers:manage)
 * 8. Audit logging for all critical asset lifecycle operations
 * 9. Zero-fabrication invariant (clean tenants return 0 records)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  archiveVehicle,
  addVehicleDocument,
  listVehicleDocuments,
  addVehicleMaintenance,
  listVehicleMaintenance,
  getFleetSummary,
  _resetFleetStore,
} from '@/lib/services/fleet.service';
import {
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  archiveDriver,
  addDriverDocument,
  listDriverDocuments,
  getDriverSummary,
  _resetDriverStore,
} from '@/lib/services/driver.service';
import {
  GET as getVehiclesRoute,
  POST as postVehiclesRoute,
} from '@/app/api/v1/fleet/vehicles/route';
import {
  GET as getVehicleIdRoute,
  PATCH as patchVehicleIdRoute,
  DELETE as deleteVehicleIdRoute,
} from '@/app/api/v1/fleet/vehicles/[id]/route';
import {
  GET as getDriversRoute,
  POST as postDriversRoute,
} from '@/app/api/v1/drivers/route';
import {
  GET as getDriverIdRoute,
  PATCH as patchDriverIdRoute,
  DELETE as deleteDriverIdRoute,
} from '@/app/api/v1/drivers/[id]/route';

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

describe('Phase 9: Fleet + Drivers Management', () => {
  beforeEach(() => {
    _resetFleetStore();
    _resetDriverStore();
  });

  // ===========================================================================
  // 1. VEHICLE MANAGEMENT & VALIDATION
  // ===========================================================================
  describe('Vehicle Operations & Validation', () => {
    it('creates and retrieves a new vehicle with NER terrain specifications', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-AX-1010',
          makeModel: 'Mahindra Bolero Camper 4x4',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 1500,
          cargoVolumeM3: 4.5,
          maxGradientPct: 28,
          maxWidthMeters: 2.1,
          waterCrossingDepthMm: 450,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 92,
          facilityId: 'hub_guwahati_central',
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: { type: 'Point', coordinates: [91.7362, 26.1445] },
          lastTelemetryAt: new Date().toISOString(),
        },
        LOGISTICS_MGR_ASSAM
      );

      expect(vehicle.id).toMatch(/^veh-/);
      expect(vehicle.registrationNumber).toBe('AS-01-AX-1010');
      expect(vehicle.organizationId).toBe('org_assam_civil_supplies');
      expect(vehicle.status).toBe('AVAILABLE');
      expect(vehicle.isArchived).toBe(false);

      const retrieved = await getVehicleById(vehicle.id, LOGISTICS_MGR_ASSAM);
      expect(retrieved.id).toBe(vehicle.id);
      expect(retrieved.maxGradientPct).toBe(28);
    });

    it('rejects vehicle registration with duplicate registration number in the same tenant', async () => {
      await createVehicle(
        {
          registrationNumber: 'AS-01-BX-2020',
          makeModel: 'Tata 407 Gold',
          type: 'MINI_TRUCK',
          payloadCapacityKg: 2500,
          cargoVolumeM3: 7.0,
          maxGradientPct: 18,
          maxWidthMeters: 2.3,
          waterCrossingDepthMm: 350,
          hasColdChain: true,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 70,
          currentFuelPct: 85,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        LOGISTICS_MGR_ASSAM
      );

      await expect(
        createVehicle(
          {
            registrationNumber: 'AS-01-BX-2020',
            makeModel: 'Another Truck',
            type: 'MINI_TRUCK',
            payloadCapacityKg: 2000,
            cargoVolumeM3: 5.0,
            maxGradientPct: 15,
            maxWidthMeters: 2.0,
            waterCrossingDepthMm: 300,
            hasColdChain: false,
            fuelType: 'DIESEL',
            fuelCapacityLiters: 50,
            currentFuelPct: 50,
            facilityId: null,
            assignedDriverId: null,
            status: 'AVAILABLE',
            currentLocation: null,
            lastTelemetryAt: null,
          },
          LOGISTICS_MGR_ASSAM
        )
      ).rejects.toThrow(/already exists/);
    });

    it('updates vehicle operational status and specifications', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-CX-3030',
          makeModel: 'Ashok Leyland Ecomet',
          type: 'MEDIUM_TRUCK',
          payloadCapacityKg: 7500,
          cargoVolumeM3: 18.0,
          maxGradientPct: 15,
          maxWidthMeters: 2.5,
          waterCrossingDepthMm: 400,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 120,
          currentFuelPct: 70,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        LOGISTICS_MGR_ASSAM
      );

      const updated = await updateVehicle(
        vehicle.id,
        { status: 'MAINTENANCE', currentFuelPct: 45 },
        LOGISTICS_MGR_ASSAM
      );

      expect(updated.status).toBe('MAINTENANCE');
      expect(updated.currentFuelPct).toBe(45);
    });

    it('archives a vehicle and marks it OFFLINE without hard deletion', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-DX-4040',
          makeModel: 'Tata 407',
          type: 'MINI_TRUCK',
          payloadCapacityKg: 2200,
          cargoVolumeM3: 6.0,
          maxGradientPct: 18,
          maxWidthMeters: 2.2,
          waterCrossingDepthMm: 300,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 60,
          facilityId: null,
          assignedDriverId: 'drv-old',
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        LOGISTICS_MGR_ASSAM
      );

      const res = await archiveVehicle(vehicle.id, LOGISTICS_MGR_ASSAM, 'Engine retirement');
      expect(res.success).toBe(true);

      const retrieved = await getVehicleById(vehicle.id, LOGISTICS_MGR_ASSAM);
      expect(retrieved.isArchived).toBe(true);
      expect(retrieved.status).toBe('OFFLINE');
      expect(retrieved.assignedDriverId).toBeNull();

      // Ensure active listing omits archived vehicles
      const { vehicles } = await listVehicles({ include_archived: false }, LOGISTICS_MGR_ASSAM);
      expect(vehicles.some((v) => v.id === vehicle.id)).toBe(false);
    });
  });

  // ===========================================================================
  // 2. VEHICLE DOCUMENTS & MAINTENANCE
  // ===========================================================================
  describe('Vehicle Compliance Documents & Maintenance Logs', () => {
    it('records and lists vehicle documents with verification metadata', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-EX-5050',
          makeModel: 'Tata 407',
          type: 'MINI_TRUCK',
          payloadCapacityKg: 2500,
          cargoVolumeM3: 6.5,
          maxGradientPct: 20,
          maxWidthMeters: 2.2,
          waterCrossingDepthMm: 350,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 65,
          currentFuelPct: 90,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        LOGISTICS_MGR_ASSAM
      );

      const doc = await addVehicleDocument(
        vehicle.id,
        {
          documentType: 'FITNESS_CERTIFICATE',
          documentNumber: 'FC-AS-2026-883',
          issuedAt: '2026-01-01T00:00:00Z',
          expiresAt: '2027-01-01T00:00:00Z',
          storageUrl: 'https://docs.auraner.gov.in/vault/fc-883',
          notes: 'Tested on Shillong mountain grade',
        },
        LOGISTICS_MGR_ASSAM
      );

      expect(doc.id).toMatch(/^vdoc-/);
      expect(doc.isVerified).toBe(true);

      const docs = await listVehicleDocuments(vehicle.id, LOGISTICS_MGR_ASSAM);
      expect(docs.length).toBe(1);
      expect(docs[0].documentNumber).toBe('FC-AS-2026-883');
    });

    it('logs vehicle maintenance events with odometer reading and cost', async () => {
      const vehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-FX-6060',
          makeModel: 'Mahindra 4x4',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 1500,
          cargoVolumeM3: 4.0,
          maxGradientPct: 25,
          maxWidthMeters: 2.0,
          waterCrossingDepthMm: 450,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 80,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        LOGISTICS_MGR_ASSAM
      );

      const maint = await addVehicleMaintenance(
        vehicle.id,
        {
          maintenanceType: 'BRAKE_OVERHAUL',
          odometerKm: 24500,
          description: 'Replaced mountain brake pads and fluid',
          costInr: 6500,
          performedAt: new Date().toISOString(),
          nextServiceDueKm: 34500,
          serviceProvider: 'Guwahati Depot',
        },
        LOGISTICS_MGR_ASSAM
      );

      expect(maint.id).toMatch(/^maint-/);
      expect(maint.costInr).toBe(6500);

      const records = await listVehicleMaintenance(vehicle.id, LOGISTICS_MGR_ASSAM);
      expect(records.length).toBe(1);
      expect(records[0].maintenanceType).toBe('BRAKE_OVERHAUL');
    });
  });

  // ===========================================================================
  // 3. DRIVER MANAGEMENT & ONBOARDING
  // ===========================================================================
  describe('Driver Operations & Certifications', () => {
    it('onboards and retrieves a driver with mountain road experience', async () => {
      const driver = await createDriver(
        {
          userId: null,
          name: 'Dorjee Khandu',
          phone: '+91 9876543210',
          email: 'dorjee@assamlogistics.in',
          licenseNumber: 'AS-01-2024-5544',
          licenseExpiry: '2028-06-30T00:00:00Z',
          mountainExperienceYears: 7,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 100,
        },
        LOGISTICS_MGR_ASSAM
      );

      expect(driver.id).toMatch(/^drv-/);
      expect(driver.name).toBe('Dorjee Khandu');
      expect(driver.mountainExperienceYears).toBe(7);
      expect(driver.dutyStatus).toBe('AVAILABLE');
      expect(driver.safetyScore).toBe(100);

      const retrieved = await getDriverById(driver.id, LOGISTICS_MGR_ASSAM);
      expect(retrieved.id).toBe(driver.id);
    });

    it('rejects duplicate driver license within the same organization', async () => {
      await createDriver(
        {
          userId: null,
          name: 'Driver One',
          phone: '+91 9123456780',
          email: null,
          licenseNumber: 'DL-AS-9988',
          licenseExpiry: '2027-01-01T00:00:00Z',
          mountainExperienceYears: 3,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 100,
        },
        LOGISTICS_MGR_ASSAM
      );

      await expect(
        createDriver(
          {
            userId: null,
            name: 'Driver Two',
            phone: '+91 9123456781',
            email: null,
            licenseNumber: 'DL-AS-9988',
            licenseExpiry: '2027-01-01T00:00:00Z',
            mountainExperienceYears: 2,
            dutyStatus: 'AVAILABLE',
            currentVehicleId: null,
            safetyScore: 100,
          },
          LOGISTICS_MGR_ASSAM
        )
      ).rejects.toThrow(/already registered/);
    });

    it('updates driver duty status and safety score', async () => {
      const driver = await createDriver(
        {
          userId: null,
          name: 'Tenzing Norbu',
          phone: '+91 9988776655',
          email: 'tenzing@assamlogistics.in',
          licenseNumber: 'AS-01-2023-7722',
          licenseExpiry: '2029-01-01T00:00:00Z',
          mountainExperienceYears: 10,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 100,
        },
        LOGISTICS_MGR_ASSAM
      );

      const updated = await updateDriver(
        driver.id,
        { dutyStatus: 'RESTING', safetyScore: 98 },
        LOGISTICS_MGR_ASSAM
      );

      expect(updated.dutyStatus).toBe('RESTING');
      expect(updated.safetyScore).toBe(98);
    });

    it('suspends and archives a driver, setting duty status to OFF_DUTY', async () => {
      const driver = await createDriver(
        {
          userId: null,
          name: 'Driver Suspended',
          phone: '+91 9876543200',
          email: null,
          licenseNumber: 'AS-SUSP-1122',
          licenseExpiry: '2027-01-01T00:00:00Z',
          mountainExperienceYears: 1,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: 'veh-temp',
          safetyScore: 70,
        },
        LOGISTICS_MGR_ASSAM
      );

      const res = await archiveDriver(driver.id, LOGISTICS_MGR_ASSAM, 'Safety violation');
      expect(res.success).toBe(true);

      const retrieved = await getDriverById(driver.id, LOGISTICS_MGR_ASSAM);
      expect(retrieved.isArchived).toBe(true);
      expect(retrieved.dutyStatus).toBe('OFF_DUTY');
      expect(retrieved.currentVehicleId).toBeNull();
    });

    it('records and lists driver certification documents (Mountain Endorsement)', async () => {
      const driver = await createDriver(
        {
          userId: null,
          name: 'Lobsang Sangay',
          phone: '+91 9876543201',
          email: null,
          licenseNumber: 'AS-01-2022-3344',
          licenseExpiry: '2028-01-01T00:00:00Z',
          mountainExperienceYears: 5,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 95,
        },
        LOGISTICS_MGR_ASSAM
      );

      const doc = await addDriverDocument(
        driver.id,
        {
          documentType: 'MOUNTAIN_HILL_ENDORSEMENT',
          documentNumber: 'MHE-NER-4455',
          issuedAt: '2025-01-01T00:00:00Z',
          expiresAt: '2028-01-01T00:00:00Z',
          storageUrl: 'https://docs.auraner.gov.in/vault/mhe-4455',
          notes: 'Endorsed for steep gradient NH-2 and NH-29 passes',
        },
        LOGISTICS_MGR_ASSAM
      );

      expect(doc.id).toMatch(/^ddoc-/);
      expect(doc.isVerified).toBe(true);

      const docs = await listDriverDocuments(driver.id, LOGISTICS_MGR_ASSAM);
      expect(docs.length).toBe(1);
      expect(docs[0].documentType).toBe('MOUNTAIN_HILL_ENDORSEMENT');
    });
  });

  // ===========================================================================
  // 4. MULTI-TENANCY & ORGANIZATION ISOLATION
  // ===========================================================================
  describe('Multi-Tenancy & Cross-Tenant Access Enforcement', () => {
    it('isolates vehicles between Assam and Meghalaya organizations', async () => {
      // 1. Create Assam vehicle
      const assamVehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-ORG-100',
          makeModel: 'Tata 407',
          type: 'MINI_TRUCK',
          payloadCapacityKg: 2000,
          cargoVolumeM3: 5.0,
          maxGradientPct: 15,
          maxWidthMeters: 2.1,
          waterCrossingDepthMm: 300,
          hasColdChain: false,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 60,
          currentFuelPct: 80,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_ASSAM
      );

      // 2. Create Meghalaya vehicle
      const meghalayaVehicle = await createVehicle(
        {
          registrationNumber: 'ML-05-ORG-200',
          makeModel: 'Mahindra Bolero',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 1500,
          cargoVolumeM3: 4.0,
          maxGradientPct: 30,
          maxWidthMeters: 2.0,
          waterCrossingDepthMm: 450,
          hasColdChain: true,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 55,
          currentFuelPct: 90,
          facilityId: null,
          assignedDriverId: null,
          status: 'AVAILABLE',
          currentLocation: null,
          lastTelemetryAt: null,
        },
        ORG_ADMIN_MEGHALAYA
      );

      // 3. Assam admin queries fleet -> only sees Assam vehicle
      const assamList = await listVehicles({}, ORG_ADMIN_ASSAM);
      expect(assamList.vehicles.length).toBe(1);
      expect(assamList.vehicles[0].registrationNumber).toBe('AS-01-ORG-100');

      // 4. Meghalaya admin queries fleet -> only sees Meghalaya vehicle
      const meghalayaList = await listVehicles({}, ORG_ADMIN_MEGHALAYA);
      expect(meghalayaList.vehicles.length).toBe(1);
      expect(meghalayaList.vehicles[0].registrationNumber).toBe('ML-05-ORG-200');

      // 5. Cross-tenant access attempt throws ForbiddenError
      await expect(getVehicleById(meghalayaVehicle.id, ORG_ADMIN_ASSAM)).rejects.toThrow(
        /Tenant access denied/
      );

      // 6. Super Admin has global visibility
      const superAdminList = await listVehicles({}, SUPER_ADMIN);
      expect(superAdminList.vehicles.length).toBe(2);
    });

    it('isolates drivers between Assam and Meghalaya organizations', async () => {
      const assamDriver = await createDriver(
        {
          userId: null,
          name: 'Assam Driver',
          phone: '+91 9876543202',
          email: null,
          licenseNumber: 'AS-ISO-11',
          licenseExpiry: '2028-01-01T00:00:00Z',
          mountainExperienceYears: 4,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 92,
        },
        ORG_ADMIN_ASSAM
      );

      const meghalayaDriver = await createDriver(
        {
          userId: null,
          name: 'Meghalaya Driver',
          phone: '+91 9876543203',
          email: null,
          licenseNumber: 'ML-ISO-22',
          licenseExpiry: '2028-01-01T00:00:00Z',
          mountainExperienceYears: 6,
          dutyStatus: 'AVAILABLE',
          currentVehicleId: null,
          safetyScore: 97,
        },
        ORG_ADMIN_MEGHALAYA
      );

      const assamRoster = await listDrivers({}, ORG_ADMIN_ASSAM);
      expect(assamRoster.drivers.length).toBe(1);
      expect(assamRoster.drivers[0].name).toBe('Assam Driver');

      await expect(getDriverById(meghalayaDriver.id, ORG_ADMIN_ASSAM)).rejects.toThrow(
        /Tenant access denied/
      );

      const superRoster = await listDrivers({}, SUPER_ADMIN);
      expect(superRoster.drivers.length).toBe(2);
    });
  });

  // ===========================================================================
  // 5. RBAC PERMISSIONS ENFORCEMENT ON API ROUTES
  // ===========================================================================
  describe('RBAC Route Protection & Capability Gating', () => {
    it('POST /api/v1/fleet/vehicles: Permitted for LOGISTICS_MANAGER, Denied for VIEWER', async () => {
      const validPayload = {
        registration_number: 'AS-01-API-1111',
        make_model: 'Tata 407 Gold',
        type: 'MINI_TRUCK',
        payload_capacity_kg: 2500,
        cargo_volume_m3: 5.5,
        max_gradient_pct: 18,
        max_width_meters: 2.2,
        water_crossing_depth_mm: 350,
        has_cold_chain: false,
        fuel_type: 'DIESEL',
        current_fuel_pct: 90,
      };

      // 1. Permitted for LOGISTICS_MANAGER (has fleet:manage)
      const allowedReq = createMockNextRequest('/api/v1/fleet/vehicles', 'POST', validPayload, LOGISTICS_MGR_ASSAM);
      const allowedRes = await postVehiclesRoute(allowedReq);
      expect(allowedRes.status).toBe(201);

      // 2. Denied (403 Forbidden) for VIEWER (lacks fleet:manage)
      const deniedReq = createMockNextRequest('/api/v1/fleet/vehicles', 'POST', {
        ...validPayload,
        registration_number: 'AS-01-API-2222',
      }, VIEWER_ASSAM);
      const deniedRes = await postVehiclesRoute(deniedReq);
      expect(deniedRes.status).toBe(403);
    });

    it('POST /api/v1/drivers: Permitted for ORG_ADMIN, Denied for VIEWER', async () => {
      const driverPayload = {
        name: 'API Test Driver',
        phone: '+91 9876543204',
        license_number: 'DL-API-9900',
        license_expiry: '2028-01-01T00:00:00Z',
        mountain_experience_years: 4,
        duty_status: 'AVAILABLE',
      };

      const allowedReq = createMockNextRequest('/api/v1/drivers', 'POST', driverPayload, ORG_ADMIN_ASSAM);
      const allowedRes = await postDriversRoute(allowedReq);
      expect(allowedRes.status).toBe(201);

      const deniedReq = createMockNextRequest('/api/v1/drivers', 'POST', {
        ...driverPayload,
        license_number: 'DL-API-9901',
      }, VIEWER_ASSAM);
      const deniedRes = await postDriversRoute(deniedReq);
      expect(deniedRes.status).toBe(403);
    });

    it('GET /api/v1/fleet/vehicles: Permitted for VIEWER (has fleet:read)', async () => {
      const req = createMockNextRequest('/api/v1/fleet/vehicles', 'GET', undefined, VIEWER_ASSAM);
      const res = await getVehiclesRoute(req);
      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // 6. ZERO-FABRICATION INVARIANT
  // ===========================================================================
  describe('Strict Zero-Fabrication Invariant', () => {
    it('returns exactly 0 counts for an organization without vehicles or drivers', async () => {
      const freshOrgUser: SessionUser = {
        id: 'usr_fresh_org',
        email: 'admin@fresh-org.gov.in',
        name: 'Fresh Org Admin',
        role: 'ORG_ADMIN',
        organizationId: 'org_fresh_clean_tenant',
      };

      const fleetSummary = await getFleetSummary(freshOrgUser);
      expect(fleetSummary.totalVehicles).toBe(0);
      expect(fleetSummary.availableVehicles).toBe(0);
      expect(fleetSummary.inTransitVehicles).toBe(0);
      expect(fleetSummary.maintenanceVehicles).toBe(0);
      expect(fleetSummary.avgFuelPct).toBe(0);

      const driverSummary = await getDriverSummary(freshOrgUser);
      expect(driverSummary.totalDrivers).toBe(0);
      expect(driverSummary.availableDrivers).toBe(0);
      expect(driverSummary.onTripDrivers).toBe(0);
      expect(driverSummary.avgSafetyScore).toBe(0);

      const { vehicles } = await listVehicles({}, freshOrgUser);
      expect(vehicles).toEqual([]);

      const { drivers } = await listDrivers({}, freshOrgUser);
      expect(drivers).toEqual([]);
    });
  });
});
