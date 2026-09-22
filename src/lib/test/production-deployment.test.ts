/**
 * AuraNER / NER-Route AI — Production Deployment & Readiness Verification Suite
 * Phase 27: Production Deployment & Operations
 *
 * Exhaustively verifies all 13 operational domains, production invariants,
 * zero-test-data guard, persistent backend architecture, backup/rollback SLA,
 * and deep health/readiness endpoints.
 */

import { describe, it, expect } from 'vitest';
import { validateEnv, getProductionInfo, serverEnvSchema } from '../env';
import {
  verifyProductionSchemaIntegrity,
  runProductionMigration,
  inspectForTestDataContamination,
} from '../../../scripts/production-db-migrate';
import { planProductionRollback, runProductionRollback } from '../../../scripts/production-rollback';
import { evaluateProductionBackupStatus } from '../../../scripts/production-backup';
import {
  evaluateProductionDeploymentReadiness,
  getProductionDeployedComponents,
} from '../services/production-deployment.service';
import { GET as getHealthLiveness } from '@/app/api/health/route';
import { GET as getHealthReady } from '@/app/api/health/ready/route';
import { GET as getProductionReadinessApi } from '@/app/api/v1/production/readiness/route';
import { signAuthToken } from '../auth/token-verifier';
import { NextRequest } from 'next/server';

describe('Phase 27: Production Deployment & Operations Verification Suite', () => {
  // ===========================================================================
  // 1. Production Environment & Secrets Invariants
  // ===========================================================================
  describe('1. Production Environment & Secrets Safety Invariants', () => {
    it('should strictly reject ALLOW_MOCK_PROVIDERS=true in production environment', () => {
      const invalidProd = {
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: true,
        JWT_SECRET: 'production_high_entropy_secret_key_99998888777766665555',
        NEXT_PUBLIC_APP_URL: 'https://ne-routeai.in',
      };
      const result = validateEnv(invalidProd);
      expect(result.success).toBe(false);
      expect(result.errors?.ALLOW_MOCK_PROVIDERS?._errors[0]).toContain(
        'ALLOW_MOCK_PROVIDERS must not be enabled in production environment'
      );
    });

    it('should strictly reject default development JWT_SECRET in production environment', () => {
      const invalidSecret = {
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: false,
        JWT_SECRET: 'ner-routeai-secret-key-sih-2024-production',
        NEXT_PUBLIC_APP_URL: 'https://ne-routeai.in',
      };
      const result = validateEnv(invalidSecret);
      expect(result.success).toBe(false);
      expect(result.errors?.JWT_SECRET?._errors[0]).toContain(
        'Insecure default JWT_SECRET must not be used in production environment'
      );
    });

    it('should strictly enforce HTTPS on NEXT_PUBLIC_APP_URL in production environment', () => {
      const insecureUrl = {
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: false,
        JWT_SECRET: 'production_high_entropy_secret_key_99998888777766665555',
        NEXT_PUBLIC_APP_URL: 'http://insecure-domain.ne-routeai.in',
      };
      const result = validateEnv(insecureUrl);
      expect(result.success).toBe(false);
      expect(result.errors?.NEXT_PUBLIC_APP_URL?._errors[0]).toContain(
        'NEXT_PUBLIC_APP_URL must use secure HTTPS in production environment'
      );
    });

    it('should accept properly configured production environment', () => {
      const validProd = {
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: false,
        JWT_SECRET: 'production_high_entropy_secret_key_99998888777766665555',
        NEXT_PUBLIC_APP_URL: 'https://ne-routeai.in',
        DATABASE_URL: 'postgresql://prod_app_user:prod_pass@prod-db.postgres.database.azure.com:5432/ner_routeai_prod?sslmode=require',
        REDIS_URL: 'rediss://:prod_redis_pass@prod-redis.redis.cache.windows.net:6380/0',
        FASTAPI_BACKEND_URL: 'https://api.ne-routeai.in',
      };
      const result = validateEnv(validProd);
      expect(result.success).toBe(true);
      expect(result.data?.APP_ENV).toBe('production');
      expect(result.data?.ALLOW_MOCK_PROVIDERS).toBe(false);
    });

    it('getProductionInfo() should safely expose runtime status without leaking secrets', () => {
      const info = getProductionInfo();
      expect(info).toHaveProperty('isProduction');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('allowMockProviders');
      expect(info).toHaveProperty('hasDedicatedDatabase');
      expect(info).not.toHaveProperty('jwtSecret');
      expect(info).not.toHaveProperty('JWT_SECRET');
      expect(info).not.toHaveProperty('databasePassword');
    });
  });

  // ===========================================================================
  // 2. Production Database Migrations & Zero-Test-Data Guard
  // ===========================================================================
  describe('2. Production Database Migrations & Zero-Test-Data Guard', () => {
    it('verifyProductionSchemaIntegrity should validate SQL migration files and calculate checksums', () => {
      const schema = verifyProductionSchemaIntegrity();
      expect(schema.valid).toBe(true);
      expect(schema.errors.length).toBe(0);
      expect(schema.migrations.length).toBeGreaterThanOrEqual(2);
      expect(schema.allTables.length).toBeGreaterThan(15);
      expect(schema.compositeChecksum).toHaveLength(64); // SHA-256 hex string
    });

    it('inspectForTestDataContamination should detect prohibited test fixtures and staging markers', () => {
      const testContentWithFixture = `
        INSERT INTO organizations (id, name) VALUES ('org_staging_assam', '[STAGING_TEST_DATA] Assam Test');
      `;
      const check = inspectForTestDataContamination(testContentWithFixture);
      expect(check.hasContamination).toBe(true);
      expect(check.violations.length).toBeGreaterThan(0);

      const cleanProductionDdl = `
        CREATE TABLE IF NOT EXISTS production_routes (
          id UUID PRIMARY KEY,
          corridor_code VARCHAR(64) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      const cleanCheck = inspectForTestDataContamination(cleanProductionDdl);
      expect(cleanCheck.hasContamination).toBe(false);
      expect(cleanCheck.violations.length).toBe(0);
    });

    it('runProductionMigration dry run should successfully verify schema without mutating database', async () => {
      const result = await runProductionMigration({ dryRun: true });
      expect(result.success).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.postgisVerified).toBe(true);
      expect(result.testDataContaminationDetected).toBe(false);
      expect(result.tablesCount).toBeGreaterThan(15);
      expect(result.schemaChecksum).toHaveLength(64);
    });

    it('runProductionMigration should refuse live execution against a staging database URL', async () => {
      await expect(
        runProductionMigration({
          databaseUrl: 'postgresql://user:pass@staging-db.postgres.azure.com:5433/ner_routeai_staging',
          dryRun: false,
        })
      ).rejects.toThrow('refused to execute against staging database URL');
    });
  });

  // ===========================================================================
  // 3. Production Rollback & Point-in-Time Recovery (PITR)
  // ===========================================================================
  describe('3. Production Rollback & Point-In-Time Recovery', () => {
    it('planProductionRollback should provide deterministic plan down to 0001_init with RTO < 15 mins', () => {
      const plan = planProductionRollback({ currentVersion: '0002_domain_expansion', targetVersion: '0001_init' });
      expect(plan.canExecuteSafely).toBe(true);
      expect(plan.revertedMigrations).toEqual(['0002_domain_expansion']);
      expect(plan.tablesAffected.length).toBeGreaterThan(5);
      expect(plan.walArchiveCheckpointVerified).toBe(true);
      expect(plan.estimatedRtoMinutes).toBeLessThan(15);
    });

    it('runProductionRollback should simulate rollback execution and return WAL checkpoint and restoration point', async () => {
      const result = await runProductionRollback({ targetVersion: '0001_init', authorizedBy: 'Lead-Architect' });
      expect(result.success).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.targetVersion).toBe('0001_init');
      expect(result.restorationPoint).toContain('prod_snapshot_0001_init_');
      expect(result.walCheckpoint).toContain('wal_checkpoint_');
      expect(result.rtoAchievedMinutes).toBeLessThan(15);
    });
  });

  // ===========================================================================
  // 4. Production Backup & Disaster Recovery SLA
  // ===========================================================================
  describe('4. Production Backup & Disaster Recovery SLA', () => {
    it('evaluateProductionBackupStatus should meet strict RTO (< 15 mins) and RPO (< 1 min) SLAs', () => {
      const status = evaluateProductionBackupStatus();
      expect(status.verified).toBe(true);
      expect(status.environment).toBe('production');
      expect(status.rtoMinutes).toBeLessThan(15); // 8.2 mins
      expect(status.rpoMinutes).toBeLessThan(1); // 0.2 mins (12s)
      expect(status.walArchivingActive).toBe(true);
      expect(status.retentionDays).toBeGreaterThanOrEqual(30); // 35 days
      expect(status.geoRedundantReplication).toBe(true);
      expect(status.encryptionAtRest).toBe('AES-256-GCM');
      expect(status.primaryRegion).toBe('centralindia-pune');
      expect(status.secondaryRegion).toBe('southindia-chennai');
      expect(status.checks.every((c) => c.status === 'PASS')).toBe(true);
    });
  });

  // ===========================================================================
  // 5. Production Deployment & Readiness Domain Service
  // ===========================================================================
  describe('5. Production Deployment & Readiness Evaluation', () => {
    it('evaluateProductionDeploymentReadiness should evaluate all 13 operational dimensions', () => {
      const scorecard = evaluateProductionDeploymentReadiness();
      expect(scorecard).toHaveProperty('overallReadinessPct');
      expect(scorecard).toHaveProperty('isProductionReady');
      expect(scorecard).toHaveProperty('domains');

      const expectedDomains = [
        'environment_and_secrets',
        'database_and_migrations',
        'persistent_backend_workers',
        'frontend_web_portal',
        'authentication_and_rbac',
        'monitoring_and_tracing',
        'logging_and_auditing',
        'alerts_and_incident_escalation',
        'backups_and_disaster_recovery',
        'rollback_procedures',
        'cicd_pipeline',
        'domain_and_networking',
        'health_and_readiness_probes',
      ];

      expectedDomains.forEach((domainKey) => {
        expect(scorecard.domains).toHaveProperty(domainKey);
        expect(scorecard.domains[domainKey].scorePct).toBeGreaterThanOrEqual(75);
      });

      expect(scorecard.overallReadinessPct).toBeGreaterThanOrEqual(90);
    });

    it('getProductionDeployedComponents should catalog full production infrastructure topology', () => {
      const components = getProductionDeployedComponents();
      expect(components.length).toBeGreaterThanOrEqual(7);

      const frontend = components.find((c) => c.category === 'FRONTEND');
      expect(frontend).toBeDefined();
      expect(frontend?.targetRuntime).toContain('Vercel');

      const persistentBackend = components.find((c) => c.category === 'BACKEND_PERSISTENT');
      expect(persistentBackend).toBeDefined();
      expect(persistentBackend?.targetRuntime).toContain('Kubernetes');

      const database = components.find((c) => c.category === 'DATABASE');
      expect(database).toBeDefined();
      expect(database?.targetRuntime).toContain('PostgreSQL Flexible Server');

      const cache = components.find((c) => c.category === 'CACHE');
      expect(cache).toBeDefined();
      expect(cache?.targetRuntime).toContain('Redis');
    });
  });

  // ===========================================================================
  // 6. Production Health Probes & Deep Readiness Endpoints
  // ===========================================================================
  describe('6. Production Health & Readiness Endpoints', () => {
    it('GET /api/health should respond with healthy liveness status', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?probe=liveness');
      const res = await getHealthLiveness(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('healthy');
      expect(json.data.probe).toBe('liveness');
    });

    it('GET /api/health/ready should respond with operational readiness and production_parity check', async () => {
      const res = await getHealthReady();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ready');
      expect(json.data.probe).toBe('readiness');
      expect(json.data.checks).toHaveProperty('database');
      expect(json.data.checks).toHaveProperty('production_parity');
      expect(json.data.readiness_score_pct).toBeGreaterThanOrEqual(80);
    });
  });

  // ===========================================================================
  // 7. Production Readiness REST API Endpoint
  // ===========================================================================
  describe('7. Production Readiness REST API Endpoint (/api/v1/production/readiness)', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/production/readiness');
      const res = await getProductionReadinessApi(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin/non-dispatcher users with 403', async () => {
      const viewerToken = signAuthToken({
        id: 'usr_viewer_test',
        email: 'viewer@ne-routeai.in',
        name: 'Viewer Test',
        role: 'VIEWER',
        organizationId: 'org_test',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/production/readiness', {
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
      });

      const res = await getProductionReadinessApi(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('should allow authorized OPS_MANAGER and return full scorecard and deployed components', async () => {
      const opsToken = signAuthToken({
        id: 'usr_ops_lead',
        email: 'ops.lead@ne-routeai.in',
        name: 'Ops Lead',
        role: 'OPS_MANAGER',
        organizationId: 'org_central',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/production/readiness', {
        headers: {
          Authorization: `Bearer ${opsToken}`,
        },
      });

      const res = await getProductionReadinessApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('scorecard');
      expect(json.data).toHaveProperty('deployedComponents');
      expect(json.data.scorecard.overallReadinessPct).toBeGreaterThanOrEqual(90);
      expect(json.data.deployedComponents.length).toBeGreaterThanOrEqual(7);
    });
  });
});
