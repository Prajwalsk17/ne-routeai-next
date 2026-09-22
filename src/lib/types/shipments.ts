/**
 * AuraNER / NER-Route AI — Shipment & Trip Domain Types
 * 
 * Aligned with Phase 4 PostgreSQL/PostGIS domain models and Phase 6 Multi-Tenancy.
 */

import {
  CargoClassification,
  ShipmentPriority,
  ShipmentStatus,
  TripStatus,
  TripStopType,
} from '@/lib/db/schema';

export type {
  CargoClassification,
  ShipmentPriority,
  ShipmentStatus,
  TripStatus,
  TripStopType,
};

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  sku: string;
  description: string;
  quantity: number;
  unitWeightKg: number;
  unitVolumeM3: number;
  isFragile: boolean;
  isHazardous: boolean;
  createdAt: string;
}

export interface Shipment {
  id: string;
  organizationId: string;
  shipmentCode: string;
  originFacilityId: string;
  destinationFacilityId: string;
  cargoClassification: CargoClassification;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  totalWeightKg: number;
  totalVolumeM3: number;
  requiresColdChain: boolean;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  deliveredAt: string | null;
  podSignatureUrl: string | null;
  podPhotoUrl: string | null;
  notes?: string;
  items: ShipmentItem[];
  assignedTripId?: string | null;
  assignedVehicleId?: string | null;
  assignedDriverId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripStop {
  id: string;
  tripId: string;
  facilityId: string;
  stopOrder: number;
  stopType: TripStopType;
  plannedArrival: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
}

export interface TripAssignment {
  id: string;
  tripId: string;
  shipmentId: string;
  assignedBy: string | null;
  assignedAt: string;
}

export interface Trip {
  id: string;
  organizationId: string;
  tripCode: string;
  vehicleId: string;
  driverId: string;
  routeVersionId: string | null;
  status: TripStatus;
  scheduledStart: string;
  actualStart: string | null;
  completedAt: string | null;
  stops: TripStop[];
  assignedShipmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentSummaryMetrics {
  totalShipments: number;
  draftShipments: number;
  plannedShipments: number;
  assignedShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  delayedShipments: number;
  cancelledShipments: number;
  coldChainShipments: number;
  totalWeightKg: number;
}

export interface TripSummaryMetrics {
  totalTrips: number;
  scheduledTrips: number;
  enRouteTrips: number;
  atStopTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}
