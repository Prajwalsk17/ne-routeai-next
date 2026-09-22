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

export const CARGO_CLASSIFICATIONS = [
  'GENERAL_FREIGHT',
  'MEDICAL_VACCINES',
  'ESSENTIAL_PDS',
  'HAZMAT',
  'DISASTER_RELIEF',
] as const;

export const SHIPMENT_STATUSES = [
  'DRAFT',
  'PLANNED',
  'ASSIGNED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELAYED',
  'REROUTING',
  'DELIVERED',
  'CANCELLED',
] as const;

export const TRIP_STATUSES = [
  'SCHEDULED',
  'EN_ROUTE',
  'AT_STOP',
  'COMPLETED',
  'CANCELLED',
  'EMERGENCY_HALT',
] as const;

export const TRIP_STOP_TYPES = [
  'PICKUP',
  'DELIVERY',
  'CHECKPOINT',
  'REST_STOP',
  'SAFE_HAVEN',
] as const;

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
export const coordinatePointSchema = z.object({
  lat: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  lng: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
});

export const routeCalculationSchema = z
  .object({
    origin_id: z.string().min(1, 'Origin location is required'),
    destination_id: z.string().min(1, 'Destination location is required'),
    origin_coords: coordinatePointSchema.optional(),
    destination_coords: coordinatePointSchema.optional(),
    vehicle_id: z.string().optional(),
    vehicle_type: z.string().optional(),
    transport_mode: z.string().optional(),
    cargo_type: z.string().optional(),
    cargo_weight_kg: z.coerce.number().optional(),
    urgency: z.string().optional(),
    risk_tolerance: z.string().optional(),
    priority: z.enum(SHIPMENT_PRIORITIES).optional(),
    avoid_incidents: z.boolean().default(true),
    avoid_coordinates: z.array(coordinatePointSchema).optional(),
    waypoints: z.array(coordinatePointSchema).optional(),
  })
  .refine(
    (data) => data.origin_id.trim().toLowerCase() !== data.destination_id.trim().toLowerCase(),
    {
      message: 'Origin and destination must be different locations.',
      path: ['destination_id'],
    }
  );

// 4. Shipment Creation Validation
export const shipmentItemCreateSchema = z.object({
  sku: z.string().min(1, 'SKU code is required'),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit_weight_kg: z.coerce.number().positive('Unit weight must be positive'),
  unit_volume_m3: z.coerce.number().positive().default(0.1),
  is_fragile: z.boolean().default(false),
  is_hazardous: z.boolean().default(false),
});

export const shipmentCreateSchema = z
  .object({
    origin_id: z.string().optional(),
    origin_facility_id: z.string().optional(),
    destination_id: z.string().optional(),
    destination_facility_id: z.string().optional(),
    cargo_type: z.string().optional(),
    cargo_classification: z.enum(CARGO_CLASSIFICATIONS).optional(),
    cargo_weight_kg: z.coerce.number().positive('Weight must be positive').optional(),
    total_weight_kg: z.coerce.number().positive('Total weight must be positive').optional(),
    cargo_volume_m3: z.coerce.number().positive().default(1.0).optional(),
    total_volume_m3: z.coerce.number().positive().default(1.0).optional(),
    priority: z.enum(SHIPMENT_PRIORITIES).default('MEDIUM'),
    requires_cold_chain: z.boolean().default(false),
    min_temperature_c: z.coerce.number().optional().nullable(),
    max_temperature_c: z.coerce.number().optional().nullable(),
    scheduled_departure: z.string().optional().nullable(),
    notes: z.string().optional(),
    items: z.array(shipmentItemCreateSchema).optional(),
  })
  .refine((data) => Boolean(data.origin_id || data.origin_facility_id), {
    message: 'Origin facility is required',
    path: ['origin_id'],
  })
  .refine((data) => Boolean(data.destination_id || data.destination_facility_id), {
    message: 'Destination facility is required',
    path: ['destination_id'],
  });

// 5. Shipment Dispatch Validation
export const shipmentDispatchSchema = z.object({
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  vehicle_id: z.string().min(1, 'Vehicle assignment is required'),
  driver_id: z.string().min(1, 'Driver assignment is required'),
  route_id: z.string().min(1, 'Selected route ID is required'),
});

// 6. Telemetry & GPS Ingest Validation
export const gpsPositionIngestSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  trip_id: z.string().optional().nullable(),
  shipment_id: z.string().optional().nullable(),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  speed_kmh: z.coerce.number().min(0, 'Speed must be positive').max(250, 'Speed cannot exceed 250 km/h').default(0),
  heading_degrees: z.coerce.number().min(0, 'Heading must be >= 0').max(360, 'Heading must be <= 360').default(0),
  altitude_meters: z.coerce.number().min(-500).max(9000).optional().nullable(),
  accuracy_meters: z.coerce.number().positive('Accuracy must be greater than 0').optional().nullable(),
  battery_pct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  recorded_at: z.string().optional().refine((val) => {
    if (!val) return true;
    const time = new Date(val).getTime();
    if (isNaN(time)) return false;
    const now = Date.now();
    // Disallow future timestamps > 5 minutes in future
    if (time > now + 5 * 60 * 1000) return false;
    // Disallow ancient timestamps > 7 days old
    if (time < now - 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  }, { message: 'Timestamp is invalid or out of acceptable temporal window (max 5m future, 7d past)' }),
  is_offline_cached: z.boolean().optional().default(false),
}).refine(
  (pos) => !(Math.abs(pos.latitude) < 0.0001 && Math.abs(pos.longitude) < 0.0001),
  { message: 'Invalid GPS coordinate (0, 0) / Null Island rejected. Sensor coordinates must be valid non-zero values.', path: ['latitude'] }
);

export const gpsBatchIngestSchema = z.object({
  positions: z.array(gpsPositionIngestSchema)
    .min(1, 'At least 1 position required')
    .max(100, 'Batch cannot exceed 100 positions'),
});

// Backward-compatible schema for legacy telemetry route callers
export const telemetryIngestSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  shipment_id: z.string().optional().nullable(),
  trip_id: z.string().optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speed_kmh: z.coerce.number().min(0).max(250).default(0),
  heading_degrees: z.coerce.number().min(0).max(360).default(0),
  altitude_meters: z.coerce.number().optional().nullable(),
  accuracy_meters: z.coerce.number().optional().nullable(),
  battery_pct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  recorded_at: z.string().optional(),
  is_offline_cached: z.boolean().optional(),
}).refine(
  (pos) => !(Math.abs(pos.latitude) < 0.0001 && Math.abs(pos.longitude) < 0.0001),
  { message: 'Invalid GPS coordinate (0, 0) / Null Island rejected. Sensor coordinates must be valid non-zero values.', path: ['latitude'] }
);

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

// 13. Vehicle Management Validation Schemas
export const VEHICLE_TYPES = [
  'LIGHT_VAN',
  'MINI_TRUCK',
  'MEDIUM_TRUCK',
  'HEAVY_TRUCK',
  'UTILITY_4X4',
  'REFRIGERATED_TRUCK',
  'BOAT',
] as const;

export const VEHICLE_STATUSES = [
  'AVAILABLE',
  'ASSIGNED',
  'IN_TRANSIT',
  'MAINTENANCE',
  'OFFLINE',
] as const;

export const VEHICLE_DOC_TYPES = [
  'REGISTRATION_CERTIFICATE',
  'FITNESS_CERTIFICATE',
  'MOUNTAIN_PERMIT',
  'INSURANCE',
] as const;

export const MAINTENANCE_TYPES = [
  'ROUTINE_SERVICE',
  'BRAKE_OVERHAUL',
  'TIRE_ROTATION',
  'SUSPENSION_MOUNTAIN',
  'EMERGERING_REPAIR',
] as const;

export const DRIVER_DUTY_STATUSES = [
  'AVAILABLE',
  'ON_TRIP',
  'RESTING',
  'OFF_DUTY',
] as const;

export const DRIVER_DOC_TYPES = [
  'COMMERCIAL_LICENSE',
  'MOUNTAIN_HILL_ENDORSEMENT',
  'MEDICAL_FITNESS',
  'POLICE_VERIFICATION',
] as const;

export const vehicleCreateSchema = z.object({
  registration_number: z
    .string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(20, 'Registration number must not exceed 20 characters')
    .regex(/^[A-Z0-9\s-]+$/, 'Must be valid alphanumeric registration number (e.g. AS-01-AX-1010)'),
  make_model: z.string().min(2, 'Make and model is required'),
  type: z.enum(VEHICLE_TYPES),
  payload_capacity_kg: z.coerce.number().positive('Payload capacity must be a positive number'),
  cargo_volume_m3: z.coerce.number().positive().default(5.0),
  max_gradient_pct: z.coerce.number().min(1).max(50).default(15),
  max_width_meters: z.coerce.number().min(0.5).max(5.0).default(2.2),
  water_crossing_depth_mm: z.coerce.number().min(0).default(300),
  has_cold_chain: z.boolean().default(false),
  fuel_type: z.string().default('DIESEL'),
  fuel_capacity_liters: z.coerce.number().positive().optional().nullable(),
  current_fuel_pct: z.coerce.number().min(0).max(100).default(100),
  facility_id: z.string().optional().nullable(),
  assigned_driver_id: z.string().optional().nullable(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().extend({
  status: z.enum(VEHICLE_STATUSES).optional(),
});

export const vehicleFilterSchema = z.object({
  status: z.enum(VEHICLE_STATUSES).optional(),
  type: z.enum(VEHICLE_TYPES).optional(),
  has_cold_chain: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

export const vehicleDocCreateSchema = z.object({
  document_type: z.enum(VEHICLE_DOC_TYPES),
  document_number: z.string().min(2, 'Document number is required'),
  issued_at: z.string().min(4, 'Valid issue date is required'),
  expires_at: z.string().min(4, 'Valid expiry date is required'),
  storage_url: z.string().default('https://docs.auraner.gov.in/vault/local-doc'),
  notes: z.string().optional(),
});

export const vehicleMaintenanceCreateSchema = z.object({
  maintenance_type: z.enum(MAINTENANCE_TYPES),
  odometer_km: z.coerce.number().min(0, 'Odometer reading must be non-negative'),
  description: z.string().min(3, 'Maintenance description is required'),
  cost_inr: z.coerce.number().min(0).optional().nullable(),
  performed_at: z.string().default(() => new Date().toISOString()),
  next_service_due_km: z.coerce.number().positive().optional().nullable(),
  service_provider: z.string().optional(),
});

// 14. Driver Management Validation Schemas
export const driverCreateSchema = z.object({
  name: z.string().min(2, 'Driver name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^(\+91[\-\s]?)?[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'),
  email: z.string().email('Invalid email address').optional().nullable(),
  license_number: z.string().min(5, 'Valid license number is required'),
  license_expiry: z.string().min(4, 'Valid license expiry date is required'),
  mountain_experience_years: z.coerce.number().min(0).max(50).default(0),
  duty_status: z.enum(DRIVER_DUTY_STATUSES).default('AVAILABLE'),
  current_vehicle_id: z.string().optional().nullable(),
});

export const driverUpdateSchema = driverCreateSchema.partial().extend({
  safety_score: z.coerce.number().min(0).max(100).optional(),
});

export const driverFilterSchema = z.object({
  duty_status: z.enum(DRIVER_DUTY_STATUSES).optional(),
  min_experience: z.coerce.number().min(0).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

export const driverDocCreateSchema = z.object({
  document_type: z.enum(DRIVER_DOC_TYPES),
  document_number: z.string().min(2, 'Document number is required'),
  issued_at: z.string().min(4, 'Valid issue date is required'),
  expires_at: z.string().min(4, 'Valid expiry date is required'),
  storage_url: z.string().default('https://docs.auraner.gov.in/vault/local-doc'),
  notes: z.string().optional(),
});

// 15. Shipment & Trip Lifecycle Validation Schemas
export const shipmentUpdateSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES).optional(),
  priority: z.enum(SHIPMENT_PRIORITIES).optional(),
  scheduled_departure: z.string().optional().nullable(),
  actual_departure: z.string().optional().nullable(),
  delivered_at: z.string().optional().nullable(),
  pod_signature_url: z.string().optional().nullable(),
  pod_photo_url: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const shipmentFilterSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES).optional(),
  priority: z.enum(SHIPMENT_PRIORITIES).optional(),
  requires_cold_chain: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

export const tripStopCreateSchema = z.object({
  facility_id: z.string().min(1, 'Facility ID is required'),
  stop_order: z.coerce.number().min(1, 'Stop order must be at least 1'),
  stop_type: z.enum(TRIP_STOP_TYPES),
  planned_arrival: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const tripCreateSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle assignment is required'),
  driver_id: z.string().min(1, 'Driver assignment is required'),
  route_version_id: z.string().optional().nullable(),
  scheduled_start: z.string().default(() => new Date().toISOString()),
  stops: z.array(tripStopCreateSchema).optional(),
  shipment_ids: z.array(z.string()).optional(),
});

export const tripUpdateSchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
  actual_start: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  vehicle_id: z.string().optional(),
  driver_id: z.string().optional(),
});

export const tripFilterSchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
  driver_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

export const tripAssignmentCreateSchema = z.object({
  shipment_id: z.string().min(1, 'Shipment ID is required'),
});

// 19. Offline Sync Batch Validation
export const syncOperationSchema = z.object({
  id: z.string().min(1, 'Operation ID is required'),
  type: z.enum(['GPS_PING', 'CHECKPOINT_CLEARANCE', 'HAZARD_REPORT', 'PROOF_OF_DELIVERY', 'SOS_TRIGGER']),
  entity_id: z.string().min(1, 'Entity ID is required'),
  payload: z.record(z.unknown()),
  client_timestamp: z.string().min(1, 'Client timestamp is required'),
  version: z.union([z.number(), z.string()]).optional(),
});

export const syncBatchRequestSchema = z.object({
  device_id: z.string().optional().default('mobile_app'),
  driver_id: z.string().optional(),
  organization_id: z.string().optional(),
  operations: z.array(syncOperationSchema)
    .min(1, 'At least one operation required for sync batch')
    .max(200, 'Batch exceeds limit of 200 operations'),
});

// 20. NER Data Ingestion Architecture Validation
export const DATA_SOURCE_PROVIDER_TYPES = [
  'REST_API',
  'GOV_BULLETIN',
  'HYDRO_GAUGE',
  'DISASTER_ALERT',
  'GEOJSON_FEED',
  'MANUAL_ENTRY',
] as const;

export const DATA_SOURCE_STATES = [
  'ASSAM',
  'MEGHALAYA',
  'NAGALAND',
  'MANIPUR',
  'TRIPURA',
  'MIZORAM',
  'ARUNACHAL_PRADESH',
  'SIKKIM',
  'ALL_NER',
] as const;

export const createDataSourceSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  name: z.string().min(3, 'Source name must be at least 3 characters'),
  provider_type: z.enum(DATA_SOURCE_PROVIDER_TYPES),
  endpoint_url: z.string().url('Invalid endpoint URL').nullable().optional(),
  fetch_interval_seconds: z.coerce.number().int().min(60).max(86400).default(3600),
  state: z.enum(DATA_SOURCE_STATES).default('ALL_NER'),
  is_active: z.boolean().default(true),
  freshness_ttl_seconds: z.coerce.number().int().min(60).max(604800).default(3600),
});

export const updateDataSourceSchema = createDataSourceSchema.partial().omit({ code: true });

export const triggerIngestionRunSchema = z.object({
  data_source_id: z.string().optional(),
  data_source_code: z.string().optional(),
  dry_run: z.boolean().optional().default(false),
  force: z.boolean().optional().default(false),
});

export const externalWeatherRecordSchema = z.object({
  station_name: z.string().min(2, 'Station name required'),
  station_code: z.string().min(2, 'Station code required'),
  state: z.string().min(2, 'State required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  temperature_c: z.coerce.number().min(-50).max(60),
  rainfall_mm_1h: z.coerce.number().min(0).max(500).default(0),
  rainfall_mm_24h: z.coerce.number().min(0).max(2000).default(0),
  wind_speed_kmh: z.coerce.number().min(0).max(350).default(0),
  visibility_km: z.coerce.number().min(0).max(100).default(10),
  condition_code: z.enum([
    'CLEAR',
    'PARTLY_CLOUDY',
    'RAIN',
    'HEAVY_RAIN',
    'FOG',
    'CLOUDBURST',
    'THUNDERSTORM',
    'CYCLONE',
  ]),
  is_severe_warning: z.boolean().default(false),
  observed_at: z.string().min(1, 'Observed timestamp is required'),
  source_record_id: z.string().optional(),
});

export const externalRoadEventRecordSchema = z.object({
  highway_code: z.string().min(2, 'Highway code required (e.g. NH-29)'),
  sector_name: z.string().min(2, 'Sector name required (e.g. Zubza Pass)'),
  state: z.string().min(2, 'State required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  blockage_type: z.enum([
    'BOTH_LANES_BLOCKED',
    'SINGLE_LANE_OPEN',
    'TEMPORARY_DIVERSION',
    'BRIDGE_UNSAFE',
    'SURFACE_EROSION',
  ]),
  reason: z.enum([
    'LANDSLIDE',
    'ROCKFALL',
    'WATERLOGGING',
    'BRIDGE_COLLAPSE',
    'ROAD_SUBSIDENCE',
    'SECURITY_RESTRICTION',
  ]),
  clearance_eta: z.string().nullable().optional(),
  is_impassable: z.boolean().default(true),
  verified_by_bro: z.boolean().default(false),
  reported_at: z.string().min(1, 'Reported timestamp required'),
  source_record_id: z.string().optional(),
});

export const externalAccessibilityRecordSchema = z.object({
  settlement_name: z.string().min(2, 'Settlement name required'),
  district: z.string().min(2, 'District name required'),
  state: z.string().min(2, 'State required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  previous_tier: z.enum(['HIGH', 'MEDIUM', 'LOW', 'ISOLATED']),
  new_tier: z.enum(['HIGH', 'MEDIUM', 'LOW', 'ISOLATED']),
  reason: z.string().min(3, 'Administrative reason required'),
  declared_by: z.string().min(2, 'Declaring authority required (e.g. ASDMA, NDRF)'),
  effective_from: z.string().min(1, 'Effective timestamp required'),
  estimated_restoration: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  source_record_id: z.string().optional(),
});

export const ingestionEventQuerySchema = z.object({
  event_type: z.enum(['weather', 'road', 'accessibility', 'all']).default('all'),
  state: z.string().optional(),
  highway_code: z.string().optional(),
  freshness: z.enum(['FRESH', 'STALE', 'EXPIRED']).optional(),
  is_severe: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// 18. Phase 15: Risk Engine Validation Schemas
export const RISK_EVENT_CATEGORIES = [
  'LANDSLIDE',
  'FLASH_FLOOD',
  'ROCKFALL',
  'ROAD_SUBSIDENCE',
  'BRIDGE_FAILURE',
  'SECURITY_CHECKPOINT',
  'CIVIL_UNREST',
  'SEVERE_WEATHER',
] as const;

export const RISK_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const RISK_EVENT_STATUSES = ['ACTIVE', 'MONITORING', 'RESOLVED'] as const;

export const createRiskEventSchema = z.object({
  event_code: z.string().min(2, 'Event code required (e.g. RSK-LANDSLIDE-001)'),
  category: z.enum(RISK_EVENT_CATEGORIES),
  severity: z.enum(RISK_SEVERITIES),
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(3, 'Description is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  affected_radius_meters: z.coerce.number().min(10).max(100000).default(1000),
  affected_corridors: z.array(z.string()).default([]),
  state: z.string().min(2, 'NER state required'),
  confidence: z.coerce.number().min(0.0).max(1.0).default(0.85),
  source_id: z.string().optional().nullable(),
  reported_at: z.string().default(() => new Date().toISOString()),
});

export const updateRiskEventSchema = z.object({
  status: z.enum(RISK_EVENT_STATUSES).optional(),
  severity: z.enum(RISK_SEVERITIES).optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  affected_radius_meters: z.coerce.number().min(10).max(100000).optional(),
  resolved_at: z.string().optional().nullable(),
});

export const riskEventQuerySchema = z.object({
  category: z.enum(RISK_EVENT_CATEGORIES).optional(),
  severity: z.enum(RISK_SEVERITIES).optional(),
  status: z.enum(RISK_EVENT_STATUSES).optional(),
  state: z.string().optional(),
  corridor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const calculateRiskSchema = z.object({
  trip_id: z.string().optional(),
  shipment_id: z.string().optional(),
  route_segments: z.array(z.any()).min(1, 'At least one route segment is required for risk assessment'),
  vehicle_location: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }).optional(),
  weather_events: z.array(z.any()).optional(),
  road_events: z.array(z.any()).optional(),
  accessibility_events: z.array(z.any()).optional(),
  risk_events: z.array(z.any()).optional(),
  telemetry: z.object({
    speed_kmh: z.number().optional(),
    speed_variance: z.number().optional(),
    gps_multipath_jitter_meters: z.number().optional(),
    dead_reckoning_duration_seconds: z.number().optional(),
    last_telemetry_timestamp: z.string().optional(),
  }).optional(),
  vehicle_specs: z.object({
    max_gradient_percent: z.number().optional(),
    gross_weight_tonnes: z.number().optional(),
    water_fording_depth_mm: z.number().optional(),
    has_cold_chain: z.boolean().optional(),
  }).optional(),
  options: z.object({
    custom_weights: z.object({
      w1_infrastructure: z.number().min(0).max(1).optional(),
      w2_meteorological: z.number().min(0).max(1).optional(),
      w3_topographical: z.number().min(0).max(1).optional(),
      w4_telemetry: z.number().min(0).max(1).optional(),
    }).optional(),
    include_ai_reasoning: z.boolean().default(true),
  }).optional(),
});

// 19. Phase 16: Accessibility Engine Validation Schemas
export const ACCESSIBILITY_TIERS = ['HIGH', 'MEDIUM', 'LOW', 'ISOLATED', 'UNKNOWN'] as const;
export const ROAD_ACCESS_QUALITIES = ['ALL_WEATHER', 'FAIR_WEATHER', '4X4_ONLY', 'RESTRICTED', 'UNKNOWN'] as const;
export const VEHICLE_ACCESS_REQUIREMENTS = [
  'ALL_VEHICLES',
  'HIGH_CLEARANCE_ONLY',
  'FOUR_WHEEL_DRIVE_ONLY',
  'CONVOY_ONLY',
  'SMALL_VEHICLE_ONLY',
  'AIR_DROP_ONLY',
  'NO_ACCESS',
  'UNKNOWN',
] as const;

export const createAccessibilityDeclarationSchema = z.object({
  declaration_code: z.string().min(2, 'Declaration code is required (e.g. ASDMA-DEC-001)'),
  settlement_name: z.string().min(2, 'Settlement name is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'NER State is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  previous_tier: z.enum(ACCESSIBILITY_TIERS).default('MEDIUM'),
  new_tier: z.enum(ACCESSIBILITY_TIERS),
  reason: z.string().min(3, 'Administrative reason required (e.g. Bridge washout)'),
  declaring_authority: z.string().min(2, 'Declaring authority required (e.g. ASDMA, PWD)'),
  effective_from: z.string().default(() => new Date().toISOString()),
  estimated_restoration: z.string().optional().nullable(),
});

export const updateAccessibilityDeclarationSchema = z.object({
  new_tier: z.enum(ACCESSIBILITY_TIERS).optional(),
  reason: z.string().min(3).optional(),
  estimated_restoration: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  resolution_notes: z.string().optional(),
});

export const accessibilityQuerySchema = z.object({
  tier: z.enum(ACCESSIBILITY_TIERS).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  freshness: z.enum(['FRESH', 'STALE', 'EXPIRED', 'UNKNOWN']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const assessAccessibilitySchema = z.object({
  route_segments: z.array(z.any()).optional(),
  location: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    coordinates: z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }),
    elevation_meters: z.number().optional(),
    state: z.string().optional(),
  }).optional(),
  facility_id: z.string().optional(),
  vehicle_specs: z.object({
    is_4wd: z.boolean().optional(),
    gross_weight_tonnes: z.number().optional(),
    height_meters: z.number().optional(),
  }).optional(),
}).refine(
  (data) => data.route_segments || data.location || data.facility_id,
  { message: 'Must provide either route_segments, location, or facility_id for accessibility assessment' }
);

// -----------------------------------------------------------------------------
// 20. Phase 17: Optimization Engine Validation Schemas
// -----------------------------------------------------------------------------
export const OPTIMIZATION_OBJECTIVES = [
  'MINIMIZE_TRANSIT_DURATION',
  'MINIMIZE_TOTAL_DISTANCE',
  'MINIMIZE_RISK_EXPOSURE',
  'MAXIMIZE_PRIORITY_FULFILLMENT',
  'BALANCED',
] as const;

export const SOLVER_ALGORITHMS = [
  'OR_TOOLS_VRPTW',
  'OR_TOOLS_CVRP',
  'HEURISTIC_TERRAIN',
] as const;

export const OPTIMIZATION_STATUSES = [
  'RUNNING',
  'OPTIMAL',
  'FEASIBLE',
  'INFEASIBLE',
  'TIMEOUT',
  'FAILED',
] as const;

export const APPROVAL_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'APPLIED',
] as const;

export const optimizationRequestSchema = z.object({
  depot_facility_id: z.string().min(1, 'Depot facility ID is required'),
  depot_coordinates: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }).optional(),
  shipment_ids: z.array(z.string()).optional(),
  shipments: z.array(z.object({
    id: z.string(),
    shipment_code: z.string().optional(),
    origin_facility_id: z.string(),
    destination_facility_id: z.string(),
    origin_coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
    destination_coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
    weight_kg: z.number().positive('Shipment weight must be positive'),
    volume_m3: z.number().positive().default(1.0),
    cargo_classification: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    requires_cold_chain: z.boolean().default(false),
    min_temperature_c: z.number().nullable().optional(),
    max_temperature_c: z.number().nullable().optional(),
    time_window: z.object({
      earliest_pickup_iso: z.string().optional(),
      latest_delivery_iso: z.string().optional(),
      service_duration_minutes: z.number().default(20),
    }).optional(),
    max_gradient_tolerance_pct: z.number().optional(),
  })).optional(),
  vehicle_ids: z.array(z.string()).optional(),
  vehicles: z.array(z.object({
    id: z.string(),
    registration_number: z.string(),
    type: z.string(),
    payload_capacity_kg: z.number().positive('Vehicle payload capacity must be positive'),
    cargo_volume_m3: z.number().positive().default(10.0),
    max_gradient_pct: z.number().min(0).max(60).default(20),
    max_width_meters: z.number().positive().default(2.5),
    water_crossing_depth_mm: z.number().min(0).default(300),
    has_cold_chain: z.boolean().default(false),
    fuel_type: z.string().optional(),
    current_fuel_pct: z.number().min(0).max(100).optional(),
    status: z.string().default('AVAILABLE'),
    assigned_driver_id: z.string().nullable().optional(),
    facility_id: z.string().nullable().optional(),
  })).optional(),
  driver_ids: z.array(z.string()).optional(),
  drivers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    duty_status: z.string().default('AVAILABLE'),
    mountain_experience_years: z.number().min(0).default(0),
    has_mountain_endorsement: z.boolean().default(false),
    max_daily_driving_hours: z.number().min(1).max(24).default(10),
    current_vehicle_id: z.string().nullable().optional(),
  })).optional(),
  primary_objective: z.enum(OPTIMIZATION_OBJECTIVES).default('BALANCED'),
  objective_weights: z.object({
    duration_weight: z.number().min(0).max(1).optional(),
    distance_weight: z.number().min(0).max(1).optional(),
    risk_weight: z.number().min(0).max(1).optional(),
    fleet_cost_weight: z.number().min(0).max(1).optional(),
  }).optional(),
  algorithm: z.enum(SOLVER_ALGORITHMS).default('OR_TOOLS_VRPTW'),
  allow_partial_fulfillment: z.boolean().default(true),
  time_limit_seconds: z.number().min(1).max(300).default(30),
}).refine(
  (data) => (data.shipment_ids && data.shipment_ids.length > 0) || (data.shipments && data.shipments.length > 0),
  { message: 'Must provide either shipment_ids or candidate shipments array' }
);

export const optimizationApproveSchema = z.object({
  comments: z.string().optional(),
});

export const optimizationApplySchema = z.object({
  create_trips: z.boolean().default(true),
  assign_shipments: z.boolean().default(true),
  lock_vehicles: z.boolean().default(true),
  notes: z.string().optional(),
});

export const optimizationRejectSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required (minimum 3 characters)'),
});

export const optimizationQuerySchema = z.object({
  status: z.enum(OPTIMIZATION_STATUSES).optional(),
  approval_status: z.enum(APPROVAL_STATUSES).optional(),
  algorithm: z.enum(SOLVER_ALGORITHMS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// 21. Phase 18: AI Agent Architecture Validation Schemas
// -----------------------------------------------------------------------------
export const AGENT_NAMES = [
  'RISK_TRIAGE_AGENT',
  'AUTONOMOUS_DETOUR_AGENT',
  'DEMAND_ALLOCATOR_AGENT',
] as const;

export const AGENT_TRIGGER_EVENTS = [
  'PROXIMITY_HAZARD_INTERCEPT',
  'HAZARD_DETECTED',
  'ROUTE_DEVIATION',
  'WEATHER_ALERT',
  'MONSOON_FORECAST',
  'INCIDENT_REPORTED',
  'DISPATCHER_QUERY',
  'MANUAL_TRIGGER',
  'MANUAL_INVOCATION',
] as const;

export const AGENT_RUN_STATUSES = [
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'HUMAN_APPROVAL_PENDING',
] as const;

export const agentRunTriggerSchema = z.object({
  agent_name: z.enum(AGENT_NAMES),
  trigger_event: z.enum(AGENT_TRIGGER_EVENTS).default('MANUAL_TRIGGER'),
  context_payload: z.record(z.unknown()).optional().default({}),
  max_iterations: z.coerce.number().int().min(1).max(10).default(5),
  max_tokens: z.coerce.number().int().min(100).max(8000).default(4000),
});

export const agentApproveSchema = z.object({
  comments: z.string().optional(),
});

export const agentRejectSchema = z
  .object({
    reason: z.string().min(3).optional(),
    rejection_reason: z.string().min(3).optional(),
  })
  .refine((data) => !!(data.reason || data.rejection_reason), {
    message: 'Rejection reason is required (minimum 3 characters)',
  });

export const agentRunQuerySchema = z.object({
  agent_name: z.enum(AGENT_NAMES).optional(),
  status: z.enum(AGENT_RUN_STATUSES).optional(),
  trigger_event: z.enum(AGENT_TRIGGER_EVENTS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// 22. Phase 19: Dynamic Replanning Validation Schemas
// -----------------------------------------------------------------------------
export const REPLANNING_TRIGGER_TYPES = [
  'GPS_DEVIATION',
  'ROAD_HAZARD_BLOCKAGE',
  'SEVERE_WEATHER_ALERT',
  'RISK_SURGE',
  'CONSIGNMENT_CHANGE',
  'VEHICLE_CONSTRAINT_VIOLATION',
  'MANUAL_DISPATCHER_REQUEST',
] as const;

export const REPLANNING_STATUSES = [
  'ANALYZING',
  'PROPOSED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'APPLIED',
  'FAILED',
] as const;

export const triggerReplanningSchema = z.object({
  trip_id: z.string().min(1, 'Trip ID is required'),
  trigger_type: z.enum(REPLANNING_TRIGGER_TYPES),
  trigger_source_id: z.string().optional(),
  current_location: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
  avoid_coordinates: z
    .array(
      z.object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
      })
    )
    .optional(),
  reason: z.string().optional(),
  force_human_approval: z.boolean().optional(),
});

export const replanningApproveSchema = z.object({
  comments: z.string().optional(),
  apply_immediately: z.boolean().optional().default(true),
});

export const replanningRejectSchema = z.object({
  rejection_reason: z.string().min(3, 'Rejection reason is required (minimum 3 characters)'),
});

export const replanningQuerySchema = z.object({
  trip_id: z.string().optional(),
  trigger_type: z.enum(REPLANNING_TRIGGER_TYPES).optional(),
  status: z.enum(REPLANNING_STATUSES).optional(),
  requires_human_approval: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// =============================================================================
// 23. Alerts & Notifications Architecture (Phase 20)
// =============================================================================

export const ALERT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const ALERT_CATEGORIES = [
  'ROAD_HAZARD',
  'WEATHER_DISRUPTION',
  'VEHICLE_BREAKDOWN',
  'CARGO_COMPROMISE',
  'GEOFENCE_DEVIATION',
  'SOS_EMERGENCY',
  'OPERATIONAL_DELAY',
  'SYSTEM',
] as const;

export const ALERT_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'ACKNOWLEDGED',
  'ESCALATED',
  'RESOLVED',
  'DISMISSED',
  'FAILED',
] as const;

export const NOTIFICATION_CHANNELS = ['IN_APP', 'PUSH', 'SMS', 'EMAIL', 'LOG'] as const;

export const NOTIFICATION_STATUSES = [
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'RETRYING',
] as const;

export const RECIPIENT_TYPES = ['DRIVER', 'DISPATCHER', 'ADMIN', 'ORG_BROADCAST'] as const;

export const createAlertSchema = z.object({
  title: z.string().min(2, 'Alert title is required (minimum 2 characters)'),
  message: z.string().min(3, 'Alert message is required (minimum 3 characters)'),
  severity: z.enum(ALERT_SEVERITIES).default('HIGH'),
  category: z.enum(ALERT_CATEGORIES).default('ROAD_HAZARD'),
  organization_id: z.string().optional(),
  shipment_id: z.string().optional(),
  trip_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  driver_id: z.string().optional(),
  incident_id: z.string().optional(),
  coordinates: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
  distance_to_hazard_km: z.coerce.number().min(0).optional(),
  deduplication_key: z.string().optional(),
  recipients: z
    .array(
      z.object({
        recipient_id: z.string().min(1, 'Recipient ID is required'),
        recipient_type: z.enum(RECIPIENT_TYPES),
        channel: z.enum(NOTIFICATION_CHANNELS),
        destination: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const sendNotificationSchema = z.object({
  recipient_id: z.string().min(1, 'Recipient ID is required'),
  recipient_type: z.enum(RECIPIENT_TYPES).default('DRIVER'),
  channel: z.enum(NOTIFICATION_CHANNELS).default('PUSH'),
  destination: z.string().min(1, 'Destination address, phone, or token is required'),
  title: z.string().min(2, 'Title is required'),
  body: z.string().min(3, 'Body is required'),
  priority: z.enum(ALERT_SEVERITIES).default('HIGH'),
  alert_id: z.string().optional(),
  deduplication_key: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const alertQuerySchema = z.object({
  status: z.string().optional(),
  severity: z.enum(ALERT_SEVERITIES).optional(),
  category: z.enum(ALERT_CATEGORIES).optional(),
  shipment_id: z.string().optional(),
  trip_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  driver_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const notificationQuerySchema = z.object({
  recipient_id: z.string().optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  alert_id: z.string().optional(),
  unread_only: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// =============================================================================
// 24. Analytics Architecture (Phase 21)
// =============================================================================

export const DATE_RANGE_PRESETS = ['7D', '30D', '90D', 'CUSTOM'] as const;

export const AGGREGATION_INTERVALS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const EXPORT_FORMATS = ['CSV', 'JSON', 'PDF_BRIEF'] as const;

export const analyticsQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  preset: z.enum(DATE_RANGE_PRESETS).optional().default('30D'),
  interval: z.enum(AGGREGATION_INTERVALS).optional().default('DAILY'),
  corridor_id: z.string().optional(),
  fleet_type: z.string().optional(),
  state: z.string().optional(),
  organization_id: z.string().optional(),
});

export const analyticsExportSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  preset: z.enum(DATE_RANGE_PRESETS).optional().default('30D'),
  interval: z.enum(AGGREGATION_INTERVALS).optional().default('DAILY'),
  format: z.enum(EXPORT_FORMATS).optional().default('CSV'),
  corridor_id: z.string().optional(),
  fleet_type: z.string().optional(),
  state: z.string().optional(),
  organization_id: z.string().optional(),
});

// =============================================================================
// 25. Field Pilot Architecture (Phase 26)
// =============================================================================

export const PILOT_FEEDBACK_CATEGORIES = [
  'GPS_ACCURACY',
  'ROUTE_NAVIGATION',
  'HAZARD_ALERT',
  'APP_USABILITY',
  'AI_ADVICE',
  'CONNECTIVITY',
  'OFFLINE_SYNC',
  'OTHER',
] as const;

export const PILOT_INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const PILOT_INCIDENT_CATEGORIES = [
  'SYSTEM_CRASH',
  'TELEMETRY_OUTAGE',
  'INCORRECT_ROUTING',
  'SAFETY_VIOLATION',
  'DATA_MISMATCH',
  'HARDWARE_FAILURE',
  'NETWORK_OFFLINE',
] as const;

export const PILOT_INCIDENT_STATUSES = [
  'REPORTED',
  'TRIAGED',
  'INVESTIGATING',
  'PATCHED',
  'RESOLVED',
  'CLOSED',
] as const;

export const createPilotFeedbackSchema = z.object({
  category: z.enum(PILOT_FEEDBACK_CATEGORIES),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(2, 'Feedback comment must have at least 2 characters').max(1000),
  trip_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const createPilotIncidentSchema = z.object({
  title: z.string().min(3, 'Incident title must have at least 3 characters').max(200),
  description: z.string().min(10, 'Detailed description of the incident is required').max(2000),
  severity: z.enum(PILOT_INCIDENT_SEVERITIES),
  category: z.enum(PILOT_INCIDENT_CATEGORIES),
  affected_corridor: z.string().optional().nullable(),
  affected_vehicle_id: z.string().optional().nullable(),
  affected_trip_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

export const updatePilotIncidentSchema = z.object({
  status: z.enum(PILOT_INCIDENT_STATUSES).optional(),
  severity: z.enum(PILOT_INCIDENT_SEVERITIES).optional(),
  assigned_to: z.string().optional().nullable(),
  root_cause: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
});









