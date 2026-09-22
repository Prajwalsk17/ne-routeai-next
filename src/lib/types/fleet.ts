/**
 * AuraNER / NER-Route AI — Fleet & Driver Domain Types
 * 
 * Aligned with Phase 4 PostgreSQL/PostGIS domain models and Phase 6 Multi-Tenancy.
 */

import {
  VehicleType,
  VehicleStatus,
  VehicleDocType,
  MaintenanceType,
  DriverDutyStatus,
  DriverDocType,
  GeoPoint,
} from '@/lib/db/schema';

export type {
  VehicleType,
  VehicleStatus,
  VehicleDocType,
  MaintenanceType,
  DriverDutyStatus,
  DriverDocType,
  GeoPoint,
};

export interface Vehicle {
  id: string;
  organizationId: string;
  facilityId: string | null;
  registrationNumber: string;
  makeModel: string;
  type: VehicleType;
  payloadCapacityKg: number;
  cargoVolumeM3: number;
  maxGradientPct: number;
  maxWidthMeters: number;
  waterCrossingDepthMm: number;
  hasColdChain: boolean;
  fuelType: string;
  fuelCapacityLiters: number | null;
  currentFuelPct: number;
  status: VehicleStatus;
  currentLocation: GeoPoint | null;
  assignedDriverId: string | null;
  isArchived: boolean;
  lastTelemetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  documentType: VehicleDocType;
  documentNumber: string;
  issuedAt: string;
  expiresAt: string;
  storageUrl: string;
  isVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  maintenanceType: MaintenanceType;
  odometerKm: number;
  description: string;
  costInr: number | null;
  performedAt: string;
  nextServiceDueKm: number | null;
  serviceProvider?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  userId: string | null;
  organizationId: string;
  name: string;
  phone: string;
  email: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  mountainExperienceYears: number;
  dutyStatus: DriverDutyStatus;
  currentVehicleId: string | null;
  safetyScore: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: DriverDocType;
  documentNumber: string;
  issuedAt: string;
  expiresAt: string;
  storageUrl: string;
  isVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetSummaryMetrics {
  totalVehicles: number;
  availableVehicles: number;
  inTransitVehicles: number;
  maintenanceVehicles: number;
  offlineVehicles: number;
  avgFuelPct: number;
  coldChainVehicles: number;
}

export interface DriverSummaryMetrics {
  totalDrivers: number;
  availableDrivers: number;
  onTripDrivers: number;
  restingDrivers: number;
  offDutyDrivers: number;
  avgSafetyScore: number;
  avgMountainExperienceYears: number;
}
