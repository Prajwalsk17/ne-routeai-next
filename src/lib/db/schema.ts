/**
 * AuraNER / NER-Route AI — Production Database Domain Schema & Types
 * PostgreSQL 16 + PostGIS 3.4 + pgvector Enterprise Schema Typings
 * 
 * Maps 1:1 with migration 0002_domain_expansion.sql covering all 34 domain entities.
 */

// -----------------------------------------------------------------------------
// Core Spatial & Vector Typings
// -----------------------------------------------------------------------------

export interface GeoPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [longitude: number, latitude: number][];
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [longitude: number, latitude: number][][];
}

export type VectorEmbedding1536 = number[];

// -----------------------------------------------------------------------------
// Domain Enums & Literals
// -----------------------------------------------------------------------------

export type OrganizationType = 'government' | 'logistics' | 'emergency' | 'defense' | 'ngo';

export type SystemRoleCode = 
  | 'SUPER_ADMIN' 
  | 'ORG_ADMIN' 
  | 'DISPATCHER' 
  | 'LOGISTICS_MANAGER' 
  | 'DRIVER' 
  | 'VIEWER';

export type AccessibilityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED';

export type RoadAccessQuality = 'ALL_WEATHER' | 'FAIR_WEATHER' | '4X4_ONLY' | 'RESTRICTED';

export type FacilityType = 
  | 'WAREHOUSE' 
  | 'DEPOT' 
  | 'HOSPITAL' 
  | 'RELIEF_CAMP' 
  | 'POLICE_POST' 
  | 'FUEL_DEPOT';

export type VehicleType = 
  | 'LIGHT_VAN' 
  | 'MINI_TRUCK' 
  | 'MEDIUM_TRUCK' 
  | 'HEAVY_TRUCK' 
  | 'UTILITY_4X4' 
  | 'REFRIGERATED_TRUCK' 
  | 'BOAT';

export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_TRANSIT' | 'MAINTENANCE' | 'OFFLINE';

export type VehicleDocType = 
  | 'REGISTRATION_CERTIFICATE' 
  | 'FITNESS_CERTIFICATE' 
  | 'MOUNTAIN_PERMIT' 
  | 'INSURANCE';

export type MaintenanceType = 
  | 'ROUTINE_SERVICE' 
  | 'BRAKE_OVERHAUL' 
  | 'TIRE_ROTATION' 
  | 'SUSPENSION_MOUNTAIN' 
  | 'EMERGERING_REPAIR';

export type DriverDutyStatus = 'AVAILABLE' | 'ON_TRIP' | 'RESTING' | 'OFF_DUTY';

export type DriverDocType = 
  | 'COMMERCIAL_LICENSE' 
  | 'MOUNTAIN_HILL_ENDORSEMENT' 
  | 'MEDICAL_FITNESS' 
  | 'POLICE_VERIFICATION';

export type CargoClassification = 
  | 'GENERAL_FREIGHT' 
  | 'MEDICAL_VACCINES' 
  | 'ESSENTIAL_PDS' 
  | 'HAZMAT' 
  | 'DISASTER_RELIEF';

export type ShipmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ShipmentStatus = 
  | 'DRAFT' 
  | 'PLANNED' 
  | 'ASSIGNED' 
  | 'DISPATCHED' 
  | 'IN_TRANSIT' 
  | 'DELAYED' 
  | 'REROUTING' 
  | 'DELIVERED' 
  | 'CANCELLED';

export type TerrainType = 'PLAIN' | 'HILLY' | 'MOUNTAINOUS';

export type TripStatus = 
  | 'SCHEDULED' 
  | 'EN_ROUTE' 
  | 'AT_STOP' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'EMERGENCY_HALT';

export type TripStopType = 'PICKUP' | 'DELIVERY' | 'CHECKPOINT' | 'REST_STOP' | 'SAFE_HAVEN';

export type RiskEventType = 
  | 'LANDSLIDE' 
  | 'FLASH_FLOOD' 
  | 'ROCKFALL' 
  | 'ROAD_COLLAPSE' 
  | 'SEISMIC' 
  | 'MILITARY_RESTRICTION';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventStatus = 'ACTIVE' | 'MONITORED' | 'RESOLVED' | 'FALSE_ALARM';

export type WeatherConditionCode = 'CLEAR' | 'RAIN' | 'HEAVY_RAIN' | 'FOG' | 'CLOUDBURST' | 'STORM';

export type RoadBlockageType = 
  | 'BOTH_LANES_BLOCKED' 
  | 'SINGLE_LANE_OPEN' 
  | 'TEMPORARY_DIVERSION' 
  | 'BRIDGE_UNSAFE';

export type AlertStatus = 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

export type NotificationChannel = 'PUSH_FCM' | 'SMS_TWILIO' | 'EMAIL_RESEND' | 'IN_APP';

export type LogisticsRequestStatus = 'QUEUED' | 'OPTIMIZING' | 'ASSIGNED' | 'FULFILLED';

export type SolverAlgorithm = 'OR_TOOLS_VRPTW' | 'OR_TOOLS_CVRP' | 'HEURISTIC_TERRAIN';

export type OptimizationStatus = 'RUNNING' | 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'FAILED';

export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'HUMAN_APPROVAL_PENDING';

export type IngestionStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

// -----------------------------------------------------------------------------
// 1. ORGANIZATIONS & MULTI-TENANCY
// -----------------------------------------------------------------------------

export interface DbOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  state: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// 2. ROLES & PERMISSIONS
// -----------------------------------------------------------------------------

export interface DbRole {
  id: string;
  code: SystemRoleCode;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPermission {
  id: string;
  code: string;
  module: string;
  description: string | null;
  created_at: string;
}

export interface DbRolePermission {
  role_id: string;
  permission_id: string;
}

// -----------------------------------------------------------------------------
// 3. USERS & MEMBERSHIPS
// -----------------------------------------------------------------------------

export interface DbUser {
  id: string;
  firebase_uid: string | null;
  email: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// 4. GEOSPATIAL LOCATIONS & FACILITIES
// -----------------------------------------------------------------------------

export interface DbLocation {
  id: string;
  name: string;
  state: string;
  district: string | null;
  type: string;
  elevation_meters: number;
  population: number | null;
  coordinates: GeoPoint;
  accessibility_tier: AccessibilityTier;
  road_access_quality: RoadAccessQuality;
  created_at: string;
  updated_at: string;
}

export interface DbFacility {
  id: string;
  organization_id: string | null;
  location_id: string;
  name: string;
  type: FacilityType;
  capacity_tons: number | null;
  cold_storage_capable: boolean;
  emergency_beds: number | null;
  contact_phone: string | null;
  coordinates: GeoPoint;
  is_operational: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// 5. FLEET, VEHICLE DOCUMENTS & MAINTENANCE
// -----------------------------------------------------------------------------

export interface DbVehicle {
  id: string;
  organization_id: string;
  facility_id: string | null;
  registration_number: string;
  make_model: string;
  type: VehicleType;
  payload_capacity_kg: number;
  cargo_volume_m3: number;
  max_gradient_pct: number;
  max_width_meters: number;
  water_crossing_depth_mm: number;
  has_cold_chain: boolean;
  fuel_type: string;
  fuel_capacity_liters: number | null;
  current_fuel_pct: number;
  status: VehicleStatus;
  current_location: GeoPoint | null;
  last_telemetry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbVehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: VehicleDocType;
  document_number: string;
  issued_at: string;
  expires_at: string;
  storage_url: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbVehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  odometer_km: number;
  description: string;
  cost_inr: number | null;
  performed_at: string;
  next_service_due_km: number | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 6. DRIVERS & DRIVER DOCUMENTS
// -----------------------------------------------------------------------------

export interface DbDriver {
  id: string;
  user_id: string;
  organization_id: string;
  license_number: string;
  license_expiry: string;
  mountain_experience_years: number;
  duty_status: DriverDutyStatus;
  current_vehicle_id: string | null;
  safety_score: number;
  created_at: string;
  updated_at: string;
}

export interface DbDriverDocument {
  id: string;
  driver_id: string;
  document_type: DriverDocType;
  document_number: string;
  issued_at: string;
  expires_at: string;
  storage_url: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// 7. SHIPMENTS & SHIPMENT ITEMS
// -----------------------------------------------------------------------------

export interface DbShipment {
  id: string;
  organization_id: string;
  shipment_code: string;
  origin_facility_id: string;
  destination_facility_id: string;
  cargo_classification: CargoClassification;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  total_weight_kg: number;
  total_volume_m3: number;
  requires_cold_chain: boolean;
  min_temperature_c: number | null;
  max_temperature_c: number | null;
  scheduled_departure: string | null;
  actual_departure: string | null;
  delivered_at: string | null;
  pod_signature_url: string | null;
  pod_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbShipmentItem {
  id: string;
  shipment_id: string;
  sku: string;
  description: string;
  quantity: number;
  unit_weight_kg: number;
  unit_volume_m3: number;
  is_fragile: boolean;
  is_hazardous: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 8. ROUTES, ROUTE VERSIONS & SEGMENTS
// -----------------------------------------------------------------------------

export interface DbRoute {
  id: string;
  organization_id: string | null;
  name: string;
  origin_location_id: string;
  destination_location_id: string;
  corridor_highway_code: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRouteVersion {
  id: string;
  route_id: string;
  version_number: number;
  geometry: GeoLineString;
  total_distance_km: number;
  estimated_duration_minutes: number;
  elevation_gain_meters: number;
  max_gradient_pct: number;
  composite_risk_score: number;
  is_active: boolean;
  change_reason: string | null;
  created_at: string;
}

export interface DbRouteSegment {
  id: string;
  route_version_id: string;
  segment_order: number;
  name: string;
  highway_code: string | null;
  geometry: GeoLineString;
  distance_km: number;
  duration_minutes: number;
  terrain: TerrainType;
  road_condition_score: number;
  bridge_weight_limit_tons: number | null;
  max_width_meters: number | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 9. TRIPS, STOPS & DISPATCH ASSIGNMENTS
// -----------------------------------------------------------------------------

export interface DbTrip {
  id: string;
  organization_id: string;
  trip_code: string;
  vehicle_id: string;
  driver_id: string;
  route_version_id: string | null;
  status: TripStatus;
  scheduled_start: string;
  actual_start: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTripStop {
  id: string;
  trip_id: string;
  facility_id: string;
  stop_order: number;
  stop_type: TripStopType;
  planned_arrival: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface DbTripAssignment {
  id: string;
  trip_id: string;
  shipment_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

// -----------------------------------------------------------------------------
// 10. TELEMETRY & GPS POSITIONS
// -----------------------------------------------------------------------------

export interface DbGpsPosition {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  coordinates: GeoPoint;
  speed_kmh: number;
  heading_degrees: number;
  altitude_meters: number | null;
  accuracy_meters: number | null;
  battery_pct: number | null;
  recorded_at: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 11. SITUATIONAL EVENTS: RISK, WEATHER, ROAD & ACCESSIBILITY
// -----------------------------------------------------------------------------

export interface DbRiskEvent {
  id: string;
  event_code: string;
  type: RiskEventType;
  severity: SeverityLevel;
  title: string;
  description: string;
  affected_geometry: GeoPolygon;
  epicenter: GeoPoint;
  confidence_score: number;
  status: EventStatus;
  source: string;
  embedding: VectorEmbedding1536 | null;
  reported_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWeatherEvent {
  id: string;
  station_name: string;
  coordinates: GeoPoint;
  temperature_c: number;
  rainfall_mm_1h: number;
  rainfall_mm_24h: number;
  wind_speed_kmh: number;
  visibility_km: number;
  condition_code: WeatherConditionCode;
  is_severe_warning: boolean;
  observed_at: string;
  created_at: string;
}

export interface DbRoadEvent {
  id: string;
  risk_event_id: string | null;
  highway_code: string;
  sector_name: string;
  coordinates: GeoPoint;
  blockage_type: RoadBlockageType;
  clearance_eta: string | null;
  is_impassable: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbAccessibilityEvent {
  id: string;
  location_id: string;
  previous_tier: AccessibilityTier;
  new_tier: AccessibilityTier;
  reason: string;
  declared_by: string;
  effective_from: string;
  estimated_restoration: string | null;
  is_active: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 12. ALERTS & NOTIFICATIONS
// -----------------------------------------------------------------------------

export interface DbAlert {
  id: string;
  organization_id: string;
  trip_id: string | null;
  risk_event_id: string | null;
  alert_code: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  distance_to_hazard_km: number | null;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface DbNotification {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  channel: NotificationChannel;
  priority: SeverityLevel;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_delivered: boolean;
  delivered_at: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 13. DEMAND, OPTIMIZATION & AI AGENT RUNS
// -----------------------------------------------------------------------------

export interface DbLogisticsRequest {
  id: string;
  organization_id: string;
  request_code: string;
  origin_facility_id: string;
  destination_facility_id: string;
  required_payload_kg: number;
  cargo_type: string;
  priority: SeverityLevel;
  status: LogisticsRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface DbOptimizationRun {
  id: string;
  organization_id: string;
  solver_algorithm: SolverAlgorithm;
  status: OptimizationStatus;
  input_request_count: number;
  allocated_vehicle_count: number;
  computation_time_ms: number;
  solution_metrics: Record<string, unknown>;
  created_at: string;
}

export interface DbAgentRun {
  id: string;
  organization_id: string | null;
  agent_name: string;
  trigger_event: string;
  status: AgentRunStatus;
  context_payload: Record<string, unknown>;
  reasoning_output: string | null;
  memory_vector: VectorEmbedding1536 | null;
  execution_duration_ms: number;
  created_at: string;
}

export interface DbAgentToolCall {
  id: string;
  agent_run_id: string;
  tool_name: string;
  tool_inputs: Record<string, unknown>;
  tool_outputs: Record<string, unknown>;
  execution_duration_ms: number;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 14. DATA SOURCES & INGESTION RUNS
// -----------------------------------------------------------------------------

export interface DbDataSource {
  id: string;
  code: string;
  name: string;
  provider_type: string;
  endpoint_url: string | null;
  fetch_interval_seconds: number;
  is_active: boolean;
  created_at: string;
}

export interface DbDataIngestionRun {
  id: string;
  data_source_id: string;
  status: IngestionStatus;
  records_ingested: number;
  records_rejected: number;
  error_log: string | null;
  duration_ms: number;
  created_at: string;
}

// -----------------------------------------------------------------------------
// 15. AUDIT TRAIL (CRYPTOGRAPHIC SHA-256 HASH CHAIN)
// -----------------------------------------------------------------------------

export interface DbAuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  user_agent: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  previous_hash: string;
  current_hash: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Schema Entity Catalog & Table Names
// -----------------------------------------------------------------------------

export const DB_TABLE_NAMES = [
  'organizations',
  'roles',
  'permissions',
  'role_permissions',
  'users',
  'organization_members',
  'locations',
  'facilities',
  'vehicles',
  'vehicle_documents',
  'vehicle_maintenance',
  'drivers',
  'driver_documents',
  'shipments',
  'shipment_items',
  'routes',
  'route_versions',
  'route_segments',
  'trips',
  'trip_stops',
  'trip_assignments',
  'gps_positions',
  'risk_events',
  'weather_events',
  'road_events',
  'accessibility_events',
  'alerts',
  'notifications',
  'logistics_requests',
  'optimization_runs',
  'agent_runs',
  'agent_tool_calls',
  'data_sources',
  'data_ingestion_runs',
  'audit_logs',
] as const;

export type DbTableName = typeof DB_TABLE_NAMES[number];
