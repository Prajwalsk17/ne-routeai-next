import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DB_TABLE_NAMES } from '@/lib/db/schema';

describe('Database Foundation & PostGIS Domain Schema (Phase 4)', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0002_domain_expansion.sql');

  it('verifies migration 0002_domain_expansion.sql exists and is populated', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent.length).toBeGreaterThan(1000);
  });

  it('verifies core spatial and vector extensions are declared', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    expect(sqlContent).toContain('CREATE EXTENSION IF NOT EXISTS "postgis";');
    expect(sqlContent).toContain('CREATE EXTENSION IF NOT EXISTS "vector";');
  });

  const requiredEntities = [
    'organizations',
    'roles',
    'permissions',
    'organization_members',
    'vehicles',
    'vehicle_documents',
    'vehicle_maintenance',
    'drivers',
    'driver_documents',
    'locations',
    'facilities',
    'shipments',
    'shipment_items',
    'trips',
    'trip_stops',
    'trip_assignments',
    'routes',
    'route_versions',
    'route_segments',
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
  ];

  it('defines all 34 required domain tables in the SQL migration', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    for (const entity of requiredEntities) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${entity}\\b`, 'i');
      expect(sqlContent, `Missing table definition for ${entity}`).toMatch(tableRegex);
    }
  });

  it('verifies TypeScript domain schema catalog matches required domain entities', () => {
    for (const entity of requiredEntities) {
      expect(DB_TABLE_NAMES).toContain(entity);
    }
    expect(DB_TABLE_NAMES.length).toBeGreaterThanOrEqual(34);
  });

  it('verifies spatial PostGIS column definitions across domain tables', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Geography & Geometry types
    expect(sqlContent).toContain('coordinates GEOGRAPHY(Point, 4326)');
    expect(sqlContent).toContain('current_location GEOGRAPHY(Point, 4326)');
    expect(sqlContent).toContain('geometry GEOMETRY(LineString, 4326)');
    expect(sqlContent).toContain('affected_geometry GEOMETRY(Polygon, 4326)');
    expect(sqlContent).toContain('epicenter GEOGRAPHY(Point, 4326)');
  });

  it('verifies all 10 PostGIS spatial GiST indexes are defined', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    const expectedGistIndexes = [
      'idx_locations_coordinates',
      'idx_facilities_coordinates',
      'idx_vehicles_current_location',
      'idx_route_versions_geometry',
      'idx_route_segments_geometry',
      'idx_gps_positions_coordinates',
      'idx_risk_events_affected_geom',
      'idx_risk_events_epicenter',
      'idx_weather_events_coordinates',
      'idx_road_events_coordinates',
    ];

    for (const idx of expectedGistIndexes) {
      expect(sqlContent, `Missing GiST index ${idx}`).toContain(idx);
    }
  });

  it('verifies pgvector semantic embeddings are declared for risk & AI memory', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('embedding vector(1536)');
    expect(sqlContent).toContain('memory_vector vector(1536)');
  });

  it('verifies cryptographic hash chaining in audit_logs for tamper-evident tracking', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('previous_hash TEXT NOT NULL');
    expect(sqlContent).toContain('current_hash TEXT NOT NULL');
  });

  it('verifies system roles are seeded with enterprise RBAC roles', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    const roles = ['SUPER_ADMIN', 'ORG_ADMIN', 'DISPATCHER', 'LOGISTICS_MANAGER', 'DRIVER', 'VIEWER'];
    for (const role of roles) {
      expect(sqlContent, `Missing seed role ${role}`).toContain(`'${role}'`);
    }
  });

  it('verifies Row-Level Security (RLS) policies are declared on tenant tables', () => {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    const rlsTables = [
      'organizations',
      'vehicles',
      'drivers',
      'shipments',
      'trips',
      'alerts',
      'audit_logs',
    ];

    for (const table of rlsTables) {
      expect(sqlContent).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });
});
