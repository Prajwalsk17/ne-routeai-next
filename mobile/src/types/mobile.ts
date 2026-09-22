/**
 * AuraNER / NER-Route AI — Driver Mobile Domain Types
 */

export type DutyStatus = 'ON_DUTY' | 'OFF_DUTY';

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedVehicleId?: string | null;
  assignedVehiclePlate?: string | null;
  organizationId: string;
  organizationName: string;
  role: 'DRIVER' | 'SUPER_ADMIN' | 'DISPATCHER';
  safetyScore: number;
  totalKmDriven: number;
}

export type TripMilestoneStatus =
  | 'ASSIGNED'
  | 'DEPARTED_DEPOT'
  | 'IN_TRANSIT'
  | 'CLEARED_CHECKPOINT'
  | 'ARRIVED_DESTINATION'
  | 'COMPLETED';

export interface TripStop {
  id: string;
  name: string;
  state: string;
  type: 'DEPOT' | 'CHECKPOINT' | 'HOSPITAL' | 'RELIEF_CENTER';
  sequence: number;
  estimatedArrival?: string;
  actualArrival?: string;
  status: 'PENDING' | 'ARRIVED' | 'CLEARED';
}

export interface CargoManifest {
  type: string;
  weightKg: number;
  isColdChain: boolean;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  handlingInstructions?: string;
}

export interface ActiveTrip {
  id: string;
  shipmentCode: string;
  origin: string;
  destination: string;
  currentMilestone: TripMilestoneStatus;
  progressPct: number;
  totalDistanceKm: number;
  remainingDistanceKm: number;
  stops: TripStop[];
  cargo: CargoManifest;
  activeRouteId?: string;
  dispatchedAt: string;
}

export type HazardType =
  | 'LANDSLIDE'
  | 'MUDSLIP'
  | 'FLASH_FLOOD'
  | 'ROAD_BLOCK'
  | 'BRIDGE_COLLAPSE'
  | 'ACCIDENT'
  | 'FALLEN_TREE';

export type HazardSeverity =
  | 'PASSABLE_CAUTION'
  | 'SINGLE_LANE_ONLY'
  | 'COMPLETELY_BLOCKED';

export interface HazardReport {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  latitude: number;
  longitude: number;
  description?: string;
  photoUri?: string;
  reportedAt: string;
}

export type OutboxItemType =
  | 'GPS_PING'
  | 'CHECKPOINT_CLEARANCE'
  | 'HAZARD_REPORT'
  | 'PROOF_OF_DELIVERY'
  | 'SOS_TRIGGER';

export type OutboxStatus = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface OutboxItem {
  id: string;
  type: OutboxItemType;
  payload: Record<string, unknown>;
  timestamp: string;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
}

export interface DriverNotification {
  id: string;
  type: 'EMERGENCY' | 'ROUTE_CHANGE' | 'DISPATCH' | 'ADVISORY';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionRoute?: string;
}
