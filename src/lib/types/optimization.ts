/**
 * AuraNER / NER-Route AI — Production Optimization Domain Types
 * 
 * Defines mathematical optimization requests, multi-dimensional constraints,
 * VRPTW/CVRP solution profiles, explainability attribution, and human approval lifecycles.
 */

import { Coordinates } from '@/lib/providers/types';
import { SolverAlgorithm, OptimizationStatus } from '@/lib/db/schema';
import { ShipmentPriority, CargoClassification } from '@/lib/types/shipments';
import { VehicleType } from '@/lib/types/fleet';

export type { SolverAlgorithm, OptimizationStatus };

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export type OptimizationObjective =
  | 'MINIMIZE_TRANSIT_DURATION'
  | 'MINIMIZE_TOTAL_DISTANCE'
  | 'MINIMIZE_RISK_EXPOSURE'
  | 'MAXIMIZE_PRIORITY_FULFILLMENT'
  | 'BALANCED';

export interface ObjectiveWeights {
  durationWeight: number;    // e.g. 0.35
  distanceWeight: number;    // e.g. 0.25
  riskWeight: number;        // e.g. 0.25
  fleetCostWeight: number;   // e.g. 0.15
}

export interface OptimizationTimeWindow {
  earliestPickupIso?: string;
  latestDeliveryIso?: string;
  serviceDurationMinutes?: number; // Stop loading/unloading time (default 20m)
}

export interface OptimizationCandidateShipment {
  id: string;
  shipmentCode?: string;
  originFacilityId: string;
  destinationFacilityId: string;
  originCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  weightKg: number;
  volumeM3: number;
  cargoClassification?: CargoClassification;
  priority: ShipmentPriority;
  requiresColdChain: boolean;
  minTemperatureC?: number | null;
  maxTemperatureC?: number | null;
  timeWindow?: OptimizationTimeWindow;
  maxGradientTolerancePct?: number;
}

export interface OptimizationCandidateVehicle {
  id: string;
  registrationNumber: string;
  type: VehicleType;
  payloadCapacityKg: number;
  cargoVolumeM3: number;
  maxGradientPct: number;
  maxWidthMeters: number;
  waterCrossingDepthMm: number;
  hasColdChain: boolean;
  fuelType?: string;
  currentFuelPct?: number;
  currentLocation?: Coordinates;
  assignedDriverId?: string | null;
  status: string; // Must be 'AVAILABLE'
  facilityId?: string | null;
}

export interface OptimizationCandidateDriver {
  id: string;
  name: string;
  phone?: string;
  dutyStatus: string; // Must be 'AVAILABLE'
  mountainExperienceYears: number;
  hasMountainEndorsement: boolean;
  maxDailyDrivingHours?: number; // Default 10h
  currentVehicleId?: string | null;
}

export interface RouteCorridorEstimate {
  fromFacilityId: string;
  toFacilityId: string;
  distanceKm: number;
  durationMinutes: number;
  maxGradientPct: number;
  riskScore: number; // 0.0 to 1.0
  accessibilityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED';
  isPassable: boolean;
}

export interface OptimizationConstraintViolation {
  constraint: 
    | 'PAYLOAD_CAPACITY_EXCEEDED'
    | 'VOLUME_CAPACITY_EXCEEDED'
    | 'COLD_CHAIN_UNAVAILABLE'
    | 'TERRAIN_GRADIENT_EXCEEDED'
    | 'DRIVER_MOUNTAIN_EXPERIENCE_INSUFFICIENT'
    | 'DRIVER_OFF_DUTY'
    | 'VEHICLE_UNAVAILABLE'
    | 'TIME_WINDOW_VIOLATED'
    | 'CORRIDOR_ISOLATED'
    | 'MAX_STOPS_EXCEEDED'
    | 'DUTY_HOURS_EXCEEDED'
    | 'DESTINATION_COORDINATES_MISSING';
  entityId: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
}

export interface PlannedStop {
  stopOrder: number;
  stopType: 'DEPOT' | 'PICKUP' | 'DELIVERY';
  facilityId: string;
  facilityName?: string;
  coordinates: Coordinates;
  shipmentId?: string;
  shipmentCode?: string;
  plannedArrival: string;
  plannedDeparture: string;
  cumulativeWeightKg: number;
  cumulativeVolumeM3: number;
  distanceFromPreviousKm: number;
  durationFromPreviousMinutes: number;
  notes?: string;
}

export interface PlannedVehicleRoute {
  vehicleId: string;
  vehicleRegistration: string;
  vehicleType: VehicleType;
  driverId: string;
  driverName: string;
  stops: PlannedStop[];
  assignedShipmentIds: string[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  peakWeightKg: number;
  payloadUtilizationPct: number;
  peakVolumeM3: number;
  volumeUtilizationPct: number;
  maxTerrainGradientPct: number;
  averageRiskScore: number;
  routeEfficiencyScore: number; // 0 to 100
}

export interface UnassignedShipmentDetail {
  shipmentId: string;
  shipmentCode?: string;
  reason: string;
  violatedConstraints: OptimizationConstraintViolation[];
}

export interface OptimizationSolutionMetrics {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalFreightWeightKg: number;
  totalFreightVolumeM3: number;
  averageCapacityUtilizationPct: number;
  averageRiskScore: number;
  objectiveScore: number;
  carbonEmissionKgEst: number;
}

export interface OptimizationExplainability {
  summary: string;
  limitingConstraints: string[];
  tradeoffsConsidered: string[];
  humanApprovalReason: string;
  algorithmNotes: string;
}

export interface OptimizationRun {
  id: string;
  organizationId: string;
  solverAlgorithm: SolverAlgorithm;
  status: OptimizationStatus;
  approvalStatus: ApprovalStatus;
  inputRequestCount: number;
  allocatedVehicleCount: number;
  unassignedRequestCount: number;
  computationTimeMs: number;
  solutionMetrics: OptimizationSolutionMetrics;
  routes: PlannedVehicleRoute[];
  unassignedRequests: UnassignedShipmentDetail[];
  violations: OptimizationConstraintViolation[];
  explainability: OptimizationExplainability;
  provenance: {
    engineVersion: string;
    computedAt: string;
    solverHash: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    appliedAt?: string | null;
    rejectionReason?: string | null;
  };
}

export interface OptimizationInputPayload {
  organizationId?: string;
  depotFacilityId: string;
  depotCoordinates?: Coordinates;
  shipmentIds?: string[];
  shipments?: OptimizationCandidateShipment[];
  vehicleIds?: string[];
  vehicles?: OptimizationCandidateVehicle[];
  driverIds?: string[];
  drivers?: OptimizationCandidateDriver[];
  corridorEstimates?: RouteCorridorEstimate[];
  primaryObjective?: OptimizationObjective;
  objectiveWeights?: Partial<ObjectiveWeights>;
  algorithm?: SolverAlgorithm;
  allowPartialFulfillment?: boolean;
  timeLimitSeconds?: number;
}
