-- =============================================================================
-- AuraNER / NER-Route AI — Production Database Migration 0002
-- PostgreSQL 16 + PostGIS 3.4 + pgvector Enterprise Schema Expansion
-- Complete 34-Entity Domain Model with Spatial Indexing & Multi-Tenancy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS & FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Trigger function for automated updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS & MULTI-TENANCY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'logistics', -- government, logistics, emergency, defense, ngo
  state TEXT NOT NULL DEFAULT 'Assam',
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ROLES & PERMISSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- SUPER_ADMIN, ORG_ADMIN, DISPATCHER, LOGISTICS_MANAGER, DRIVER, VIEWER
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g. shipments:create, routes:override, fleet:manage
  module TEXT NOT NULL,      -- fleet, shipments, routes, incidents, alerts, audit
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Seed target system roles
INSERT INTO roles (code, name, description)
VALUES 
  ('SUPER_ADMIN', 'Super Administrator', 'Global cross-tenant oversight and system management'),
  ('ORG_ADMIN', 'Organization Administrator', 'Tenant administrator managing organization assets and users'),
  ('DISPATCHER', 'Operations Dispatcher', 'Manages live shipments, route planning, and alert triage'),
  ('LOGISTICS_MANAGER', 'Logistics Manager', 'Oversees fleet health, driver compliance, and analytics'),
  ('DRIVER', 'Transport Driver', 'Mobile operator executing assigned trips and incident reporting'),
  ('VIEWER', 'Read-Only Viewer', 'Observes public safety radar and active consignment progress')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. USERS & MEMBERSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4. GEOSPATIAL LOCATIONS & FACILITIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL, -- Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim
  district TEXT,
  type TEXT NOT NULL DEFAULT 'town', -- city, town, village, checkpost
  elevation_meters INT NOT NULL DEFAULT 0,
  population INT DEFAULT 0,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  accessibility_tier TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW, ISOLATED
  road_access_quality TEXT NOT NULL DEFAULT 'ALL_WEATHER', -- ALL_WEATHER, FAIR_WEATHER, 4X4_ONLY, RESTRICTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- WAREHOUSE, DEPOT, HOSPITAL, RELIEF_CAMP, POLICE_POST, FUEL_DEPOT
  capacity_tons NUMERIC(10, 2) DEFAULT 0,
  cold_storage_capable BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_beds INT DEFAULT 0,
  contact_phone TEXT,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  is_operational BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. FLEET, VEHICLE DOCUMENTS & MAINTENANCE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  registration_number TEXT UNIQUE NOT NULL,
  make_model TEXT NOT NULL,
  type TEXT NOT NULL, -- LIGHT_VAN, MINI_TRUCK, MEDIUM_TRUCK, HEAVY_TRUCK, UTILITY_4X4, REFRIGERATED_TRUCK, BOAT
  payload_capacity_kg NUMERIC(10, 2) NOT NULL,
  cargo_volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 10.0,
  max_gradient_pct INT NOT NULL DEFAULT 15,
  max_width_meters NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  water_crossing_depth_mm INT NOT NULL DEFAULT 300,
  has_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
  fuel_type TEXT NOT NULL DEFAULT 'DIESEL',
  fuel_capacity_liters NUMERIC(6, 2) DEFAULT 100,
  current_fuel_pct INT NOT NULL DEFAULT 100 CHECK (current_fuel_pct BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, IN_TRANSIT, MAINTENANCE, OFFLINE
  current_location GEOGRAPHY(Point, 4326),
  last_telemetry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- REGISTRATION_CERTIFICATE, FITNESS_CERTIFICATE, MOUNTAIN_PERMIT, INSURANCE
  document_number TEXT NOT NULL,
  issued_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  storage_url TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL, -- ROUTINE_SERVICE, BRAKE_OVERHAUL, TIRE_ROTATION, SUSPENSION_MOUNTAIN, EMERGENCY_REPAIR
  odometer_km INT NOT NULL,
  description TEXT NOT NULL,
  cost_inr NUMERIC(10, 2) DEFAULT 0,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_service_due_km INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. DRIVERS & DRIVER DOCUMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE NOT NULL,
  license_expiry DATE NOT NULL,
  mountain_experience_years INT NOT NULL DEFAULT 0,
  duty_status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ON_TRIP, RESTING, OFF_DUTY
  current_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  safety_score INT NOT NULL DEFAULT 100 CHECK (safety_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- COMMERCIAL_LICENSE, MOUNTAIN_HILL_ENDORSEMENT, MEDICAL_FITNESS, POLICE_VERIFICATION
  document_number TEXT NOT NULL,
  issued_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  storage_url TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. SHIPMENTS & SHIPMENT ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_code TEXT UNIQUE NOT NULL,
  origin_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  destination_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  cargo_classification TEXT NOT NULL, -- GENERAL_FREIGHT, MEDICAL_VACCINES, ESSENTIAL_PDS, HAZMAT, DISASTER_RELIEF
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PLANNED, ASSIGNED, DISPATCHED, IN_TRANSIT, DELAYED, REROUTING, DELIVERED, CANCELLED
  total_weight_kg NUMERIC(10, 2) NOT NULL,
  total_volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
  requires_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
  min_temperature_c NUMERIC(4, 1),
  max_temperature_c NUMERIC(4, 1),
  scheduled_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  pod_signature_url TEXT,
  pod_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_weight_kg NUMERIC(8, 2) NOT NULL,
  unit_volume_m3 NUMERIC(8, 2) DEFAULT 0.01,
  is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
  is_hazardous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. ROUTES, ROUTE VERSIONS & SEGMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  corridor_highway_code TEXT, -- e.g. NH-29, NH-2, NH-10
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  geometry GEOMETRY(LineString, 4326) NOT NULL,
  total_distance_km NUMERIC(10, 2) NOT NULL,
  estimated_duration_minutes INT NOT NULL,
  elevation_gain_meters INT NOT NULL DEFAULT 0,
  max_gradient_pct INT NOT NULL DEFAULT 0,
  composite_risk_score INT NOT NULL DEFAULT 0 CHECK (composite_risk_score BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_version_id UUID NOT NULL REFERENCES route_versions(id) ON DELETE CASCADE,
  segment_order INT NOT NULL,
  name TEXT NOT NULL,
  highway_code TEXT,
  geometry GEOMETRY(LineString, 4326) NOT NULL,
  distance_km NUMERIC(8, 2) NOT NULL,
  duration_minutes INT NOT NULL,
  terrain TEXT NOT NULL DEFAULT 'PLAIN', -- PLAIN, HILLY, MOUNTAINOUS
  road_condition_score INT NOT NULL DEFAULT 80 CHECK (road_condition_score BETWEEN 0 AND 100),
  bridge_weight_limit_tons NUMERIC(5, 2),
  max_width_meters NUMERIC(4, 2) DEFAULT 3.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TRIPS, STOPS & DISPATCH ASSIGNMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_code TEXT UNIQUE NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  route_version_id UUID REFERENCES route_versions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, EN_ROUTE, AT_STOP, COMPLETED, CANCELLED, EMERGENCY_HALT
  scheduled_start TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  stop_order INT NOT NULL,
  stop_type TEXT NOT NULL DEFAULT 'DELIVERY', -- PICKUP, DELIVERY, CHECKPOINT, REST_STOP, SAFE_HAVEN
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, shipment_id)
);

-- -----------------------------------------------------------------------------
-- 10. TELEMETRY & GPS POSITIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gps_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 0,
  heading_degrees NUMERIC(5, 2) NOT NULL DEFAULT 0,
  altitude_meters NUMERIC(7, 2),
  accuracy_meters NUMERIC(6, 2),
  battery_pct INT CHECK (battery_pct BETWEEN 0 AND 100),
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. SITUATIONAL EVENTS: RISK, WEATHER, ROAD & ACCESSIBILITY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- LANDSLIDE, FLASH_FLOOD, ROCKFALL, ROAD_COLLAPSE, SEISMIC, MILITARY_RESTRICTION
  severity TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_geometry GEOMETRY(Polygon, 4326) NOT NULL,
  epicenter GEOGRAPHY(Point, 4326) NOT NULL,
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MONITORED, RESOLVED, FALSE_ALARM
  source TEXT NOT NULL DEFAULT 'SYSTEM', -- BRO, IMD, POLICE, DRIVER_CROWDSOURCED, NDRF
  embedding vector(1536), -- Semantic vector embeddings for NLP situational matching
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_name TEXT NOT NULL,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  temperature_c NUMERIC(5, 2) NOT NULL,
  rainfall_mm_1h NUMERIC(6, 2) NOT NULL DEFAULT 0,
  rainfall_mm_24h NUMERIC(6, 2) NOT NULL DEFAULT 0,
  wind_speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 0,
  visibility_km NUMERIC(5, 2) NOT NULL DEFAULT 10,
  condition_code TEXT NOT NULL, -- CLEAR, RAIN, HEAVY_RAIN, FOG, CLOUDBURST, STORM
  is_severe_warning BOOLEAN NOT NULL DEFAULT FALSE,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_event_id UUID REFERENCES risk_events(id) ON DELETE CASCADE,
  highway_code TEXT NOT NULL, -- NH-29, NH-2, NH-10, etc.
  sector_name TEXT NOT NULL,  -- e.g. Zubza, Piphema, Sonapur Tunnel
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  blockage_type TEXT NOT NULL, -- BOTH_LANES_BLOCKED, SINGLE_LANE_OPEN, TEMPORARY_DIVERSION, BRIDGE_UNSAFE
  clearance_eta TIMESTAMPTZ,
  is_impassable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accessibility_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  previous_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL, -- HIGH, MEDIUM, LOW, ISOLATED
  reason TEXT NOT NULL,
  declared_by TEXT NOT NULL, -- SDMA, NDRF, BRO, DISTRICT_COLLECTOR
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_restoration TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. ALERTS & NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  risk_event_id UUID REFERENCES risk_events(id) ON DELETE SET NULL,
  alert_code TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, CRITICAL
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  distance_to_hazard_km NUMERIC(6, 2),
  status TEXT NOT NULL DEFAULT 'SENT', -- SENT, DELIVERED, ACKNOWLEDGED, ESCALATED, RESOLVED
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- PUSH_FCM, SMS_TWILIO, EMAIL_RESEND, IN_APP
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. DEMAND, OPTIMIZATION & AI AGENT RUNS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_code TEXT UNIQUE NOT NULL,
  origin_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  destination_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  required_payload_kg NUMERIC(10, 2) NOT NULL,
  cargo_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, OPTIMIZING, ASSIGNED, FULFILLED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS optimization_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  solver_algorithm TEXT NOT NULL, -- OR_TOOLS_VRPTW, OR_TOOLS_CVRP, HEURISTIC_TERRAIN
  status TEXT NOT NULL DEFAULT 'RUNNING', -- RUNNING, OPTIMAL, FEASIBLE, INFEASIBLE, TIMEOUT, FAILED
  input_request_count INT NOT NULL,
  allocated_vehicle_count INT DEFAULT 0,
  computation_time_ms INT NOT NULL DEFAULT 0,
  solution_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- RISK_TRIAGE_AGENT, AUTONOMOUS_DETOUR_AGENT, DEMAND_ALLOCATOR
  trigger_event TEXT NOT NULL, -- PROXIMITY_HAZARD_INTERCEPT, MONSOON_FORECAST, USER_QUERY
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- RUNNING, COMPLETED, FAILED, HUMAN_APPROVAL_PENDING
  context_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasoning_output TEXT,
  memory_vector vector(1536), -- Episodic long-term memory embedding
  execution_duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL, -- calculate_route, query_weather, scan_safe_havens, solve_cvrp
  tool_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 14. DATA SOURCES & INGESTION RUNS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- IMD_RADAR, BRO_ROAD_BULLETIN, OPENSTREETMAP_NER, NDRF_DISASTER
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- REST_API, SATELLITE_FEED, RSS_FEED, MANUAL_ENTRY
  endpoint_url TEXT,
  fetch_interval_seconds INT NOT NULL DEFAULT 3600,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PARTIAL, FAILED
  records_ingested INT NOT NULL DEFAULT 0,
  records_rejected INT NOT NULL DEFAULT 0,
  error_log TEXT,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 15. AUDIT TRAIL (CRYPTOGRAPHIC SHA-256 HASH CHAIN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,      -- SHIPMENT_DISPATCH, ROUTE_OVERRIDE, ALERT_ACKNOWLEDGE, SOS_TRIGGER
  entity_type TEXT NOT NULL, -- shipments, trips, routes, vehicles, alerts
  entity_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  previous_state JSONB,
  new_state JSONB,
  previous_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 16. PERFORMANCE & SPATIAL INDEXING
-- -----------------------------------------------------------------------------
-- PostGIS Spatial GIST Indexes
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_facilities_coordinates ON facilities USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_vehicles_current_location ON vehicles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_route_versions_geometry ON route_versions USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_route_segments_geometry ON route_segments USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_gps_positions_coordinates ON gps_positions USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_risk_events_affected_geom ON risk_events USING GIST(affected_geometry);
CREATE INDEX IF NOT EXISTS idx_risk_events_epicenter ON risk_events USING GIST(epicenter);
CREATE INDEX IF NOT EXISTS idx_weather_events_coordinates ON weather_events USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_road_events_coordinates ON road_events USING GIST(coordinates);

-- Relational Foreign Key B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_shipments_org_status ON shipments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_org_status ON trips(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_driver ON trips(vehicle_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_order ON trip_stops(trip_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_gps_positions_vehicle_time ON gps_positions(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_trip_status ON alerts(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action ON audit_logs(organization_id, action, created_at DESC);

-- -----------------------------------------------------------------------------
-- 17. ROW-LEVEL SECURITY (RLS) MULTI-TENANCY FOUNDATION
-- -----------------------------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Fallback permissive policy for authenticated application service role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_bypass') THEN
    CREATE POLICY service_role_bypass ON organizations FOR ALL TO authenticated USING (true);
  END IF;
END $$;
