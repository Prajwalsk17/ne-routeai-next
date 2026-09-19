import { z } from 'zod';

export const NE_STATES = [
  'Assam',
  'Arunachal Pradesh',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Tripura',
  'Sikkim',
] as const;

export const INCIDENT_TYPES = [
  'LANDSLIDE',
  'FLOOD',
  'ROAD_BLOCK',
  'BRIDGE_FAILURE',
  'HEAVY_RAIN',
  'STORM',
  'ROAD_DAMAGE',
  'ACCIDENT',
  'VEHICLE_BREAKDOWN',
  'ROPEWAY_FAILURE',
  'WATER_ROUTE_BLOCK',
  'FALLING_ROCKS',
  'LOW_VISIBILITY',
  'EXTREME_WEATHER',
  'SECURITY_INCIDENT',
  'TRAFFIC_DISRUPTION',
] as const;

export const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const SHIPMENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

// 1. Location Search Validation
export const locationSearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  state: z.enum(NE_STATES).optional(),
  type: z.enum(['city', 'town', 'village', 'warehouse', 'hospital', 'relief_hub', 'checkpoint', 'all']).optional(),
  limit: z.coerce.number().min(1).max(50).default(15),
});

// 2. Vehicle Selection Recommendation Validation
export const vehicleSelectionSchema = z.object({
  cargo_type: z.string().min(1, 'Cargo type is required'),
  cargo_weight_kg: z.coerce.number().positive('Cargo weight must be positive'),
  cargo_volume_m3: z.coerce.number().positive().default(1.0),
  destination_id: z.string().min(1, 'Destination location is required'),
  priority: z.enum(SHIPMENT_PRIORITIES).default('MEDIUM'),
  requires_cold_chain: z.boolean().default(false),
  requires_water_crossing: z.boolean().default(false),
});

// 3. Route Calculation Validation
export const routeCalculationSchema = z.object({
  origin_id: z.string().min(1, 'Origin location is required'),
  destination_id: z.string().min(1, 'Destination location is required'),
  vehicle_id: z.string().optional(),
  vehicle_type: z.string().optional(),
  avoid_incidents: z.boolean().default(true),
});

// 4. Shipment Creation Validation
export const shipmentCreateSchema = z.object({
  origin_id: z.string().min(1, 'Origin is required'),
  destination_id: z.string().min(1, 'Destination is required'),
  cargo_type: z.string().min(1, 'Cargo type is required'),
  cargo_weight_kg: z.coerce.number().positive('Weight must be positive'),
  cargo_volume_m3: z.coerce.number().positive().default(1.0),
  priority: z.enum(SHIPMENT_PRIORITIES).default('MEDIUM'),
  notes: z.string().optional(),
});

// 5. Shipment Dispatch Validation
export const shipmentDispatchSchema = z.object({
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  vehicle_id: z.string().min(1, 'Vehicle assignment is required'),
  driver_id: z.string().min(1, 'Driver assignment is required'),
  route_id: z.string().min(1, 'Selected route ID is required'),
});

// 6. Telemetry & GPS Ingest Validation
export const telemetryIngestSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speed_kmh: z.coerce.number().min(0).max(250).default(0),
  heading_degrees: z.coerce.number().min(0).max(360).default(0),
  altitude_meters: z.coerce.number().optional(),
  accuracy_meters: z.coerce.number().optional(),
});

// 7. Incident Reporting Validation
export const incidentReportSchema = z.object({
  type: z.enum(INCIDENT_TYPES),
  severity: z.enum(SEVERITY_LEVELS),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description is required'),
  location_name: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  affected_radius_meters: z.coerce.number().positive().default(500),
  confidence: z.coerce.number().min(0).max(1).default(0.9),
});

// 8. Alert Acknowledgment Validation
export const alertAcknowledgeSchema = z.object({
  alert_id: z.string().min(1, 'Alert ID is required'),
  action: z.enum(['ACKNOWLEDGE', 'ESCALATE', 'RESOLVE', 'DISMISS']),
  notes: z.string().optional(),
});

// 9. Route Recalculation / Diversion Validation
export const routeRecalculateSchema = z.object({
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  current_lat: z.coerce.number().min(-90).max(90),
  current_lng: z.coerce.number().min(-180).max(180),
  avoid_incident_id: z.string().optional(),
  reason: z.string().min(3, 'Recalculation reason required'),
});

// 10. Map Matching (HMM) & Raw GPS Trace Validation
export const telemetryMapMatchSchema = z.object({
  trace: z.array(
    z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      timestampMs: z.coerce.number().optional(),
      accuracyMeters: z.coerce.number().optional(),
      speedKmh: z.coerce.number().optional(),
      headingDegrees: z.coerce.number().optional(),
    })
  ).min(1, 'At least 1 GPS point required for map matching'),
  vehicle_profile: z.enum(['car', 'truck', 'heavy_truck']).default('truck'),
});

// 11. Distance-Time Matrix & VRP Optimization Validation
export const matrixOptimizationSchema = z.object({
  origins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      coordinates: z.object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
      }),
      timeWindowStart: z.string().optional(),
      timeWindowEnd: z.string().optional(),
      serviceTimeMinutes: z.coerce.number().optional(),
    })
  ).min(1, 'At least 1 origin required'),
  destinations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      coordinates: z.object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
      }),
      timeWindowStart: z.string().optional(),
      timeWindowEnd: z.string().optional(),
      serviceTimeMinutes: z.coerce.number().optional(),
    })
  ).min(1, 'At least 1 destination required'),
  consider_traffic: z.boolean().default(true),
});

// 12. Commercial Fleet Constraint Solver Validation
export const commercialRouteConstraintSchema = z.object({
  origin_id: z.string().min(1, 'Origin location required'),
  destination_id: z.string().min(1, 'Destination location required'),
  departure_time: z.string().optional(),
  vehicle_profile: z.object({
    grossVehicleWeightKg: z.coerce.number().positive().optional(),
    tareWeightKg: z.coerce.number().positive().optional(),
    payloadCapacityKg: z.coerce.number().positive().optional(),
    lengthMeters: z.coerce.number().positive().optional(),
    widthMeters: z.coerce.number().positive().optional(),
    heightMeters: z.coerce.number().positive().optional(),
    axleCount: z.coerce.number().min(2).optional(),
    maxAxleWeightKg: z.coerce.number().positive().optional(),
    isCarryingHazmat: z.boolean().optional(),
    hazmatClasses: z.array(z.string()).optional(),
    tunnelRestrictionCode: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
    hasMandatory4x4Awd: z.boolean().optional(),
    innerLinePermitVerified: z.boolean().optional(),
    eWayBillValid: z.boolean().optional(),
  }).optional(),
  avoid_incidents: z.boolean().default(true),
});

