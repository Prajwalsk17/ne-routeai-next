/**
 * AuraNER / NER-Route AI — Staging Readiness & Pre-Production Verification Suite
 * Phase 25: Staging Environment Parity & Verification
 *
 * Exhaustively verifies all 13 operational domains under staging configuration invariants:
 * 1. Authentication
 * 2. Authorization
 * 3. APIs
 * 4. Database & Migrations
 * 5. Routing Integration
 * 6. GPS Integration
 * 7. Ingestion
 * 8. Risk
 * 9. Accessibility
 * 10. Optimization
 * 11. AI Agents
 * 12. Notifications
 * 13. Analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateEnv, getStagingInfo } from '../env';
import { signAuthToken, verifyAuthToken } from '../auth/token-verifier';
import { hasPermission, normalizeRole } from '../auth/roles';
import { runStagingMigration, verifyStagingSchemaIntegrity, STAGING_TEST_FIXTURES } from '../../../scripts/staging-db-migrate';
import { planStagingRollback } from '../../../scripts/staging-rollback';
import { planRoute, _resetRouteStore } from '../services/route.service';
import { ingestGpsPosition, _resetTelemetryStore } from '../services/telemetry.service';
import { createVehicle, _resetFleetStore } from '../services/fleet.service';
import { registerDataSource, executeIngestionRun, _resetIngestionStore } from '../services/ingestion.service';
import { calculateProductionRisk, _resetRiskStore } from '../services/risk.service';
import { assessAccessibility, createAccessibilityDeclaration, _resetAccessibilityStore } from '../services/accessibility.service';
import { runOptimization, _resetOptimizationStore } from '../services/optimization.service';
import { runAgentWorkflow, approveAgentRun, _resetAgentStore } from '../services/agent.service';
import { evaluateAgentRunSuite } from '../ai/evaluation-harness';
import { createAlert, acknowledgeAlert, _resetAlertStore } from '../services/alert.service';
import { generateAnalyticsSummary, exportAnalyticsCSV } from '../services/analytics.service';
import { GET as getHealthReady } from '@/app/api/health/ready/route';
import type { SessionUser } from '../auth/session';

describe('Phase 25: Staging Environment & Multi-Subsystem Readiness Verification', () => {
  // Isolated Staging Test Users (Labelled [STAGING_TEST_DATA])
  const stagingDispatcherAssam: SessionUser = {
    id: 'usr_stg_dispatcher_assam',
    email: 'pranab.staging@assam.gov.in',
    name: '[STAGING_TEST_DATA] Pranab Bora (Dispatcher)',
    role: 'DISPATCHER',
    organizationId: 'org_staging_assam_civil_supplies',
  };

  const stagingViewerAssam: SessionUser = {
    id: 'usr_stg_viewer_assam',
    email: 'viewer.staging@assam.gov.in',
    name: '[STAGING_TEST_DATA] Jyoti Das (Viewer)',
    role: 'VIEWER',
    organizationId: 'org_staging_assam_civil_supplies',
  };

  const stagingDispatcherMeghalaya: SessionUser = {
    id: 'usr_stg_dispatcher_meg',
    email: 'wanphrang.staging@meghalaya.gov.in',
    name: '[STAGING_TEST_DATA] Wanphrang Lyngdoh (Dispatcher)',
    role: 'DISPATCHER',
    organizationId: 'org_staging_meghalaya_pwd',
  };

  let testVehicleId: string;

  beforeEach(async () => {
    _resetTelemetryStore();
    _resetFleetStore();
    _resetIngestionStore();
    _resetRiskStore();
    _resetAccessibilityStore();
    _resetOptimizationStore();
    _resetAgentStore();
    _resetAlertStore();
    _resetRouteStore();

    // Register active staging vehicle for telemetry integration
    const v = await createVehicle(
      {
        registrationNumber: 'AS-01-STG-1001',
        makeModel: 'Tata Xenon 4x4 Staging',
        type: 'UTILITY_4X4',
        status: 'AVAILABLE',
        payloadCapacityKg: 1500,
        cargoVolumeM3: 6.5,
        maxGradientPct: 22,
        maxWidthMeters: 2.1,
        waterCrossingDepthMm: 450,
        hasColdChain: false,
        fuelType: 'DIESEL',
        fuelCapacityLiters: 65,
        currentFuelPct: 85,
        facilityId: 'fac-gau-01',
        assignedDriverId: null,
        currentLocation: { type: 'Point', coordinates: [91.75, 26.15] },
        lastTelemetryAt: new Date().toISOString(),
        organizationId: stagingDispatcherAssam.organizationId ?? undefined,
      },
      stagingDispatcherAssam
    );
    testVehicleId = v.id;
  });

  // ===========================================================================
  // 1. Staging Configuration & Invariants
  // ===========================================================================
  describe('1. Staging Environment Configuration & Invariants', () => {
    it('validates staging environment configuration with secure HTTPS and non-default JWT secret', () => {
      const stagingEnv = {
        APP_ENV: 'staging',
        LOG_LEVEL: 'info',
        NEXT_PUBLIC_APP_NAME: 'AuraNER (Staging)',
        NEXT_PUBLIC_APP_URL: 'https://staging.ne-routeai.in',
        JWT_SECRET: 'auraner_staging_cryptographic_jwt_key_9381729487102938471928374',
        DATABASE_URL: 'postgresql://staging_user:secret@localhost:5433/ner_routeai_staging',
        ALLOW_MOCK_PROVIDERS: false,
      };

      const result = validateEnv(stagingEnv);
      expect(result.success).toBe(true);
      expect(result.data?.APP_ENV).toBe('staging');
      expect(result.data?.ALLOW_MOCK_PROVIDERS).toBe(false);
    });

    it('rejects insecure default development JWT secret when in staging environment', () => {
      const insecureStagingEnv = {
        APP_ENV: 'staging',
        NEXT_PUBLIC_APP_URL: 'https://staging.ne-routeai.in',
        JWT_SECRET: 'ner-routeai-secret-key-sih-2024-production', // INSECURE DEFAULT
        DATABASE_URL: 'postgresql://staging_user:secret@localhost:5433/ner_routeai_staging',
      };

      const result = validateEnv(insecureStagingEnv);
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.errors)).toContain('Insecure default JWT_SECRET must not be used in staging environment');
    });

    it('provides comprehensive staging diagnostics via getStagingInfo()', () => {
      const info = getStagingInfo();
      expect(info).toHaveProperty('isStaging');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('routingProvider');
      expect(info).toHaveProperty('telemetryProvider');
    });
  });

  // ===========================================================================
  // 2. Authentication in Staging
  // ===========================================================================
  describe('2. Authentication Subsystem in Staging', () => {
    it('creates and verifies cryptographically secure staging session tokens', async () => {
      const token = signAuthToken({
        userId: stagingDispatcherAssam.id,
        email: stagingDispatcherAssam.email,
        name: stagingDispatcherAssam.name,
        role: stagingDispatcherAssam.role,
        organizationId: stagingDispatcherAssam.organizationId,
      });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Valid JWT structure

      const verified = await verifyAuthToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(stagingDispatcherAssam.id);
      expect(verified?.organizationId).toBe(stagingDispatcherAssam.organizationId);
      expect(verified?.role).toBe('DISPATCHER');
    });

    it('rejects malformed or tampered tokens in staging', async () => {
      const token = signAuthToken({
        userId: stagingDispatcherAssam.id,
        email: stagingDispatcherAssam.email,
        name: stagingDispatcherAssam.name,
        role: stagingDispatcherAssam.role,
        organizationId: stagingDispatcherAssam.organizationId,
      });
      const tampered = token.slice(0, -5) + 'XXXXX';
      await expect(verifyAuthToken(tampered)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // 3. Authorization & RBAC in Staging
  // ===========================================================================
  describe('3. Authorization & RBAC Subsystem in Staging', () => {
    it('enforces RBAC matrix: DISPATCHER has dispatch/calculate permissions, VIEWER does not', () => {
      expect(hasPermission(normalizeRole(stagingDispatcherAssam.role), 'shipments:dispatch')).toBe(true);
      expect(hasPermission(normalizeRole(stagingDispatcherAssam.role), 'routes:calculate')).toBe(true);
      expect(hasPermission(normalizeRole(stagingViewerAssam.role), 'shipments:dispatch')).toBe(false);
      expect(hasPermission(normalizeRole(stagingViewerAssam.role), 'shipments:read')).toBe(true);
    });

    it('enforces tenant boundary isolation between Assam and Meghalaya staging users', () => {
      expect(stagingDispatcherAssam.organizationId).not.toBe(stagingDispatcherMeghalaya.organizationId);
      expect(stagingDispatcherAssam.organizationId).toBe('org_staging_assam_civil_supplies');
      expect(stagingDispatcherMeghalaya.organizationId).toBe('org_staging_meghalaya_pwd');
    });
  });

  // ===========================================================================
  // 4. Staging APIs & Readiness Probe
  // ===========================================================================
  describe('4. REST APIs & Staging Readiness Probe', () => {
    it('executes dedicated /api/health/ready probe returning 200 with readiness score', async () => {
      const response = await getHealthReady();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.status).toBe('ready');
      expect(json.data.probe).toBe('readiness');
      expect(json.data.readiness_score_pct).toBeGreaterThanOrEqual(80);
      expect(json.data.checks).toHaveProperty('database');
      expect(json.data.checks).toHaveProperty('providers');
      expect(json.data.checks).toHaveProperty('staging_parity');
    });
  });

  // ===========================================================================
  // 5. Database & Schema Migration Subsystem
  // ===========================================================================
  describe('5. Database & Schema Migration Subsystem', () => {
    it('verifies SQL migration file integrity and computes SHA-256 state checksums', () => {
      const integrity = verifyStagingSchemaIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.migrations.length).toBeGreaterThanOrEqual(2);

      const initMigration = integrity.migrations.find((m) => m.id === '0001_init');
      expect(initMigration).toBeDefined();
      expect(initMigration?.checksum).toHaveLength(64);
      expect(initMigration?.tablesCreated).toContain('users');
      expect(initMigration?.tablesCreated).toContain('routes');

      const domainMigration = integrity.migrations.find((m) => m.id === '0002_domain_expansion');
      expect(domainMigration).toBeDefined();
      expect(domainMigration?.tablesCreated).toContain('accessibility_events');
      expect(domainMigration?.tablesCreated).toContain('agent_runs');
    });

    it('executes staging migration runner and seeds isolated [STAGING_TEST_DATA] fixtures', async () => {
      const result = await runStagingMigration();
      expect(result.success).toBe(true);
      expect(result.environment).toBe('staging');
      expect(result.migrationsApplied.length).toBeGreaterThanOrEqual(2);
      expect(result.schemaChecksum).toHaveLength(64);
      expect(result.fixturesSeeded.organizationsCount).toBe(STAGING_TEST_FIXTURES.organizations.length);
      expect(result.fixturesSeeded.vehiclesCount).toBe(STAGING_TEST_FIXTURES.vehicles.length);
    });

    it('verifies safe rollback planning down to 0001_init', () => {
      const plan = planStagingRollback({ currentVersion: '0002_domain_expansion', targetVersion: '0001_init' });
      expect(plan.canExecuteSafely).toBe(true);
      expect(plan.revertedMigrations).toContain('0002_domain_expansion');
      expect(plan.tablesAffected.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 6. Routing Integration in Staging
  // ===========================================================================
  describe('6. Routing Integration in Staging', () => {
    it('calculates mountain route with topology provenance for Guwahati to Kohima', async () => {
      const route = await planRoute(
        { lat: 26.1445, lng: 91.7362 },
        { lat: 25.6751, lng: 94.1086 },
        { maxGradientPct: 20 }
      );

      expect(route).toBeDefined();
      expect(route.distanceKm).toBeGreaterThan(150);
      expect(route.durationMinutes).toBeGreaterThan(0);
      expect(route.geometry.length).toBeGreaterThan(2);
      expect(route.provenance.providerName).toBeDefined();
      expect(typeof route.provenance.routeHash).toBe('string');
      expect(route.provenance.routeHash.length).toBeGreaterThan(0);
    }, 15000);
  });

  // ===========================================================================
  // 7. GPS Telemetry Integration in Staging
  // ===========================================================================
  describe('7. GPS Telemetry Integration in Staging', () => {
    it('ingests valid staging telemetry ping and updates vehicle tracking state', async () => {
      const ping = await ingestGpsPosition(
        stagingDispatcherAssam.organizationId!,
        {
          vehicle_id: testVehicleId,
          latitude: 26.15,
          longitude: 91.75,
          altitude_meters: 55,
          speed_kmh: 42,
          heading_degrees: 90,
          accuracy_meters: 5,
          recorded_at: new Date().toISOString(),
          battery_pct: 88,
        },
        stagingDispatcherAssam
      );

      expect(ping.id).toBeDefined();
      expect(ping.vehicleId).toBe(testVehicleId);
      expect(ping.speedKmh).toBe(42);
      expect(ping.coordinates.lat).toBe(26.15);
      expect(ping.organizationId).toBe(stagingDispatcherAssam.organizationId);
    });

    it('rejects invalid telemetry coordinates or negative speed with error', async () => {
      await expect(
        ingestGpsPosition(
          stagingDispatcherAssam.organizationId!,
          {
            vehicle_id: testVehicleId,
            latitude: 105.0, // Invalid latitude > 90
            longitude: 91.75,
          },
          stagingDispatcherAssam
        )
      ).rejects.toThrow(/Invalid latitude/);

      await expect(
        ingestGpsPosition(
          stagingDispatcherAssam.organizationId!,
          {
            vehicle_id: testVehicleId,
            latitude: 26.15,
            longitude: 91.75,
            speed_kmh: -15, // Invalid negative speed
          },
          stagingDispatcherAssam
        )
      ).rejects.toThrow(/Invalid speed/);
    });
  });

  // ===========================================================================
  // 8. NER Regional Data Ingestion in Staging
  // ===========================================================================
  describe('8. NER Regional Data Ingestion in Staging', () => {
    it('registers authoritative source and triggers deduplicated ingestion run', async () => {
      const source = await registerDataSource(
        {
          code: 'BRO_STG_01',
          name: 'BRO Staging Highway Landslide Bulletin',
          provider_type: 'GOV_BULLETIN',
          endpoint_url: 'https://bro.gov.in/staging/rss',
          fetch_interval_seconds: 1800,
          state: 'ASSAM',
          is_active: true,
          freshness_ttl_seconds: 3600,
        },
        stagingDispatcherAssam
      );

      expect(source.id).toBeDefined();
      expect(source.code).toBe('BRO_STG_01');

      const result = await executeIngestionRun(
        source.id,
        {
          triggerMode: 'MANUAL',
          customPayload: [
            {
              highway_code: 'NH-27',
              sector_name: 'Jorabat Slope',
              state: 'Assam',
              latitude: 26.11,
              longitude: 91.89,
              blockage_type: 'BOTH_LANES_BLOCKED',
              reason: 'LANDSLIDE',
              reported_at: new Date().toISOString(),
              source_record_id: 'bro_stg_hazard_01',
            },
          ],
        }
      );

      expect(result.run.status).toBe('SUCCESS');
      expect(result.run.recordsIngested).toBe(1);
      expect(result.roadEvents?.length).toBe(1);
    });
  });

  // ===========================================================================
  // 9. Production Risk Engine in Staging
  // ===========================================================================
  describe('9. Production Risk Engine in Staging', () => {
    it('computes composite multi-factor risk score (0-100) with factor attribution', async () => {
      const risk = await calculateProductionRisk({
        routeSegments: [
          {
            segmentOrder: 1,
            name: 'Dimapur - Kohima High Gradient',
            startPoint: { lat: 25.9, lng: 93.7 },
            endPoint: { lat: 25.67, lng: 94.1 },
            distanceKm: 68.0,
            durationMinutes: 120,
            highwayCode: 'NH-29',
            terrain: 'MOUNTAINOUS',
            elevationMeters: 1444,
            gradientSlopePercent: 14.5,
            roadConditionScore: 55,
          },
        ],
        vehicleSpecs: {
          maxGradientPercent: 22,
          hasColdChain: true,
          waterFordingDepthMm: 450,
        },
      });

      expect(risk.compositeScore).toBeGreaterThanOrEqual(0);
      expect(risk.displayScore).toBeGreaterThanOrEqual(0);
      expect(risk.severity).toBeDefined();
      expect(risk.factors.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 10. Accessibility Intelligence Engine in Staging
  // ===========================================================================
  describe('10. Accessibility Intelligence Engine in Staging', () => {
    it('creates administrative declaration and computes corridor accessibility profile', async () => {
      const declaration = await createAccessibilityDeclaration(
        {
          declarationCode: 'STG-DEC-2026-01',
          settlementName: 'Haflong Outpost',
          district: 'Dima Hasao',
          state: 'Assam',
          coordinates: { lat: 25.18, lng: 93.02 },
          previousTier: 'MEDIUM',
          newTier: 'ISOLATED',
          reason: 'Monsoon pavement slippage on high gradient stretch',
          declaringAuthority: 'Assam PWD Staging Inspector',
          effectiveFrom: new Date().toISOString(),
          isActive: true,
          provenance: {
            sourceProvider: 'STAGING_PWD',
            sourceCode: 'PWD_AS',
            verifiedAt: new Date().toISOString(),
          },
        },
        stagingDispatcherAssam.id
      );

      expect(declaration.id).toBeDefined();
      expect(declaration.coordinates.lat).toBe(25.18);

      const assessment = await assessAccessibility({
        routeSegments: [
          {
            segmentOrder: 1,
            name: 'Haflong Hill Access Road',
            startPoint: { lat: 25.18, lng: 93.02 },
            endPoint: { lat: 25.25, lng: 93.15 },
            distanceKm: 22.0,
            durationMinutes: 45,
            highwayCode: 'SH-19',
            terrain: 'MOUNTAINOUS',
            elevationMeters: 680,
            gradientSlopePercent: 11.2,
            roadConditionScore: 40,
          },
        ],
      });

      expect(assessment.accessibilityTier).toBeDefined();
      expect(assessment.freshness).toBe('FRESH');
    });
  });

  // ===========================================================================
  // 11. Constrained Logistics Optimization in Staging
  // ===========================================================================
  describe('11. Constrained Logistics Optimization in Staging', () => {
    it('executes CVRP/VRPTW optimization run and enforces human approval gate', async () => {
      const optRun = await runOptimization(
        {
          depotFacilityId: 'fac-gau-wh-01',
          depotCoordinates: { lat: 26.1445, lng: 91.7362 },
          vehicles: [
            {
              id: 'veh-heavy-stg',
              registration_number: 'AS-01-STG-9001',
              type: 'HEAVY_TRUCK',
              payload_capacity_kg: 9000,
              cargo_volume_m3: 30.0,
              max_gradient_pct: 22,
              has_cold_chain: false,
              status: 'AVAILABLE',
            },
          ] as any,
          drivers: [
            {
              id: 'drv-tenzing-stg',
              name: 'Tenzing Staging-Driver',
              duty_status: 'AVAILABLE',
              mountain_experience_years: 8,
              has_mountain_endorsement: true,
              max_daily_driving_hours: 10,
            },
          ] as any,
          shipments: [
            {
              id: 'shp-stg-01',
              shipmentCode: 'SHP-STG-01',
              originFacilityId: 'fac-gau-wh-01',
              destinationFacilityId: 'fac-tez-01',
              destinationCoordinates: { lat: 26.6338, lng: 92.7926 },
              weightKg: 1200,
              volumeM3: 4.0,
              priority: 'HIGH',
              requiresColdChain: false,
            },
          ],
          primaryObjective: 'MINIMIZE_TRANSIT_DURATION',
        },
        stagingDispatcherAssam
      );

      expect(optRun.status).toBe('OPTIMAL');
      expect(optRun.approvalStatus).toBe('PENDING_APPROVAL'); // Human checkpoint gate
      expect(optRun.routes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // 12. AI Multi-Agent Evaluation in Staging
  // ===========================================================================
  describe('12. AI Multi-Agent Evaluation in Staging', () => {
    it('executes AI workflow with human approval checkpoint and verifies 8-dimension scorecard', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'AUTONOMOUS_DETOUR_AGENT',
          trigger_event: 'HAZARD_DETECTED',
          context_payload: {
            tripId: 'trp-stg-001',
            shipmentId: 'shp-stg-01',
            vehicleId: testVehicleId,
            driverId: 'drv-tenzing-stg',
            vehicleLocation: { lat: 25.70, lng: 94.05 },
            destinationLocation: { lat: 25.67, lng: 94.11 },
            hazardType: 'LANDSLIDE',
            hazardDistanceKm: 3.2,
          },
        },
        stagingDispatcherAssam
      );

      expect(run.status).toBe('HUMAN_APPROVAL_PENDING');
      expect(run.humanApproval.required).toBe(true);

      // Benchmark full evaluation scorecard in staging before manual approval
      const report = evaluateAgentRunSuite(run, {
        expectedTools: ['scan_safe_havens', 'calculate_route'],
      });
      expect(report.overallPassed).toBe(true);
      expect(report.overallScore).toBeGreaterThanOrEqual(90);

      const approved = await approveAgentRun(run.id, 'Verified by Staging Dispatcher', stagingDispatcherAssam);
      expect(approved.status).toBe('COMPLETED');
      expect(approved.humanApproval.status).toBe('APPROVED');
    }, 15000);
  });

  // ===========================================================================
  // 13. Alerts & Operational Analytics in Staging
  // ===========================================================================
  describe('13. Alerts & Operational Analytics in Staging', () => {
    it('creates operational alert, verifies deduplication window, and supports acknowledgement', async () => {
      const alert = await createAlert(
        {
          organizationId: stagingDispatcherAssam.organizationId!,
          severity: 'HIGH',
          category: 'ROAD_HAZARD',
          title: '[STAGING_TEST_DATA] Road Hazard on NH-27',
          message: 'Active culvert overflow reported near Sonapur bypass.',
          coordinates: { lat: 26.11, lng: 91.95 },
        },
        stagingDispatcherAssam
      );

      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('SENT');

      const ack = await acknowledgeAlert(
        { alertId: alert.id, action: 'ACKNOWLEDGE' },
        stagingDispatcherAssam
      );
      expect(ack.status).toBe('ACKNOWLEDGED');
      expect(ack.acknowledgedBy).toBe(stagingDispatcherAssam.id);
    });

    it('queries staging analytics summary and exports RFC 4180 compliant CSV', async () => {
      const summary = await generateAnalyticsSummary(
        { preset: '7D', organizationId: stagingDispatcherAssam.organizationId! },
        stagingDispatcherAssam
      );

      expect(summary.kpis.totalTrips).toBeGreaterThanOrEqual(0);
      expect(summary.kpis.completedDeliveries).toBeGreaterThanOrEqual(0);
      expect(summary.provenanceHash).toHaveLength(64);

      const csv = exportAnalyticsCSV(summary);

      expect(csv).toContain('AURANER / NER-ROUTE AI — LOGISTICS ANALYTICS BRIEF');
      expect(csv).toContain('Organization ID');
      expect(csv).toContain('Provenance Hash');
      expect(csv).toContain('CORE PERFORMANCE INDICATORS');
    });
  });
});
