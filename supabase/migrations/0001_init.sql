-- =============================================================================
-- AuraNER / NER-RouteAI — Production Database Migration 0001
-- PostgreSQL + PostGIS Core Domain Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- ENUM DEFINITIONS
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin',
  'dispatcher',
  'driver',
  'operator',
  'officer',
  'viewer'
);

CREATE TYPE vehicle_type AS ENUM (
  'LIGHT_VAN',
  'MINI_TRUCK',
  'MEDIUM_TRUCK',
  'HEAVY_TRUCK',
  'UTILITY_4X4',
  'OFFROAD_VEHICLE',
  'AMBULANCE',
  'REFRIGERATED_TRUCK',
  'FUEL_TANKER',
  'WATER_TANKER',
  'RELIEF_VEHICLE',
  'MOTORCYCLE',
  'BOAT',
  'ROPEWAY_CARGO'
);

CREATE TYPE vehicle_status AS ENUM (
  'AVAILABLE',
  'ASSIGNED',
  'IN_TRANSIT',
  'MAINTENANCE',
  'OFFLINE'
);

CREATE TYPE shipment_status AS ENUM (
  'DRAFT',
  'PLANNED',
  'ASSIGNED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELAYED',
  'REROUTING',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE shipment_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE incident_type AS ENUM (
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
  'TRAFFIC_DISRUPTION'
);

CREATE TYPE severity_level AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE alert_status AS ENUM (
  'SENT',
  'DELIVERED',
  'ACKNOWLEDGED',
  'ESCALATED',
  'RESOLVED',
  'DISMISSED'
);

CREATE TYPE route_status AS ENUM (
  'ACTIVE',
  'REPLACED',
  'BLOCKED',
  'COMPLETED'
);

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'logistics', -- government, logistics, emergency, ngo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. USERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  password_hash TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. DRIVERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  license_number TEXT NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'HEAVY',
  phone TEXT NOT NULL,
  emergency_contact TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ON_TRIP, OFF_DUTY
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. VEHICLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  registration_number TEXT UNIQUE NOT NULL,
  type vehicle_type NOT NULL,
  capacity_kg NUMERIC(10, 2) NOT NULL,
  volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 10.0,
  fuel_type TEXT NOT NULL DEFAULT 'DIESEL',
  terrain_capabilities TEXT[] NOT NULL DEFAULT ARRAY['PLAIN', 'HILLY'],
  max_gradient_pct INT NOT NULL DEFAULT 15,
  max_width_meters NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  water_crossing_capable BOOLEAN NOT NULL DEFAULT FALSE,
  current_location GEOGRAPHY(Point, 4326),
  fuel_pct INT NOT NULL DEFAULT 100,
  status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  current_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. LOCATIONS & INFRASTRUCTURE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL, -- Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim
  district TEXT,
  type TEXT NOT NULL DEFAULT 'town', -- city, town, village, warehouse, hospital, relief_hub, checkpoint
  elevation_meters INT NOT NULL DEFAULT 0,
  population INT DEFAULT 0,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  accessibility_tier TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW, ISOLATED
  road_access_quality TEXT NOT NULL DEFAULT 'ALL_WEATHER', -- ALL_WEATHER, FAIR_WEATHER, 4X4_ONLY, RESTRICTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. SHIPMENTS & DISPATCH
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_code TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  origin_id UUID NOT NULL REFERENCES locations(id),
  destination_id UUID NOT NULL REFERENCES locations(id),
  cargo_type TEXT NOT NULL,
  cargo_weight_kg NUMERIC(10, 2) NOT NULL,
  cargo_volume_m3 NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
  priority shipment_priority NOT NULL DEFAULT 'MEDIUM',
  status shipment_status NOT NULL DEFAULT 'DRAFT',
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  dispatcher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  active_route_id UUID, -- Forward reference; constrained below
  notes TEXT,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. ROUTES & SEGMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Primary Route',
  geometry GEOGRAPHY(LineString, 4326),
  total_distance_km NUMERIC(10, 2) NOT NULL,
  estimated_duration_minutes INT NOT NULL,
  composite_risk_score INT NOT NULL DEFAULT 0, -- 0 to 100
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  status route_status NOT NULL DEFAULT 'ACTIVE',
  recalculation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraint linking shipment active_route_id to routes
ALTER TABLE shipments ADD CONSTRAINT fk_shipment_active_route
  FOREIGN KEY (active_route_id) REFERENCES routes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  segment_order INT NOT NULL,
  name TEXT,
  start_point GEOGRAPHY(Point, 4326) NOT NULL,
  end_point GEOGRAPHY(Point, 4326) NOT NULL,
  distance_km NUMERIC(8, 2) NOT NULL,
  duration_minutes INT NOT NULL,
  terrain TEXT NOT NULL DEFAULT 'PLAIN', -- PLAIN, HILLY, MOUNTAINOUS
  road_condition_score INT NOT NULL DEFAULT 80, -- 0-100
  landslide_risk_score INT NOT NULL DEFAULT 0,
  flood_risk_score INT NOT NULL DEFAULT 0,
  weather_risk_score INT NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. INCIDENTS & HAZARDS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_code TEXT UNIQUE NOT NULL,
  type incident_type NOT NULL,
  severity severity_level NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_name TEXT,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  affected_radius_meters INT NOT NULL DEFAULT 500,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.850,
  source TEXT NOT NULL DEFAULT 'SYSTEM', -- SYSTEM, DRIVER, DISPATCHER, IMD_WEATHER, BRO
  reported_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INVESTIGATING, RESOLVED
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. REAL-TIME ALERTS & ESCALATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_code TEXT UNIQUE NOT NULL,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  type incident_type NOT NULL,
  severity severity_level NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  distance_to_hazard_km NUMERIC(8, 2),
  coordinates GEOGRAPHY(Point, 4326),
  status alert_status NOT NULL DEFAULT 'SENT',
  acknowledged_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TELEMETRY & GPS TRACKING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  heading_degrees INT NOT NULL DEFAULT 0,
  altitude_meters INT,
  accuracy_meters NUMERIC(6, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. ROUTE CHANGE & AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  old_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  new_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- HAZARD_DETECTED, ROUTE_RECALCULATED, DRIVER_NOTIFIED, DIVERSION_ACCEPTED
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'AI_RISK_ENGINE', -- AI_RISK_ENGINE, DISPATCHER, DRIVER, INCIDENT
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- POLICE_POST, HOSPITAL, WAREHOUSE, FUEL_STATION, RELIEF_CAMP
  state TEXT NOT NULL,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  contact_number TEXT,
  capacity_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR MAXIMUM SPATIAL & RELATIONAL QUERY PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_vehicles_geom ON vehicles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_telemetry_geom ON telemetry USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_safe_locations_geom ON safe_locations USING GIST(coordinates);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_shipment ON routes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_shipment ON alerts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON telemetry(vehicle_id, recorded_at DESC);
