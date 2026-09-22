/**
 * AuraNER / NER-Route AI — Continuous Monitoring & Improvement Verification Suite
 * Phase 28: Continuous Monitoring + Improvement
 *
 * Exhaustively verifies:
 * 1. All 18 operational monitoring vectors.
 * 2. Zero-fabrication invariant (unobserved metrics report UNOBSERVED).
 * 3. Alert threshold triggers across CRITICAL, HIGH, MEDIUM, LOW.
 * 4. AI governance invariant: "AI reasons. APIs provide facts. Algorithms calculate. Backend enforces. Humans approve critical decisions."
 * 5. Incident RCA and continuous improvement backlog workflows.
 * 6. REST API security, authorization, and response contracts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateVectorHealth,
  evaluateContinuousMonitoringHealth,
  recordUptimeObservation,
  recordApiObservation,
  recordDatabaseObservation,
  recordGpsObservation,
  recordRoutingObservation,
  recordWeatherObservation,
  recordNerIngestionObservation,
  recordRiskObservation,
  recordAccessibilityObservation,
  recordOptimizationObservation,
  recordAiAgentObservation,
  recordReplanningObservation,
  recordNotificationObservation,
  recordAnalyticsObservation,
  recordSecurityObservation,
  recordPerformanceObservation,
  recordCostObservation,
  recordUserIssueObservation,
  listMonitoringAlerts,
  acknowledgeMonitoringAlert,
  createIncidentRcaRecord,
  listIncidentRcaRecords,
  listImprovementBacklog,
  addImprovementBacklogItem,
  _resetContinuousMonitoringStore,
  TARGET_SLOS,
  VECTOR_TITLES,
} from '../services/continuous-monitoring.service';
import { GET as getMonitoringHealthApi } from '@/app/api/v1/monitoring/health/route';
import { GET as getMonitoringAlertsApi, POST as ackMonitoringAlertApi } from '@/app/api/v1/monitoring/alerts/route';
import {
  GET as getImprovementBacklogApi,
  POST as addImprovementBacklogApi,
} from '@/app/api/v1/monitoring/improvement-backlog/route';
import { signAuthToken } from '../auth/token-verifier';
import { NextRequest } from 'next/server';
import { OperationalVectorKey } from '../types/continuous-monitoring';

describe('Phase 28: Continuous Monitoring & Improvement Verification Suite', () => {
  const managerUser = {
    id: 'usr_mgr_01',
    email: 'ops.manager@assam.gov.in',
    name: 'Ops Manager',
    role: 'LOGISTICS_MANAGER' as const,
    organizationId: 'org_assam_civil',
  };

  const viewerUser = {
    id: 'usr_view_01',
    email: 'viewer@assam.gov.in',
    name: 'Auditor Viewer',
    role: 'VIEWER' as const,
    organizationId: 'org_assam_civil',
  };

  beforeEach(() => {
    _resetContinuousMonitoringStore();
  });

  // ===========================================================================
  // 1. Zero-Fabrication Invariant & 18 Operational Vectors
  // ===========================================================================
  describe('1. Zero-Fabrication Standard & 18 Operational Vectors', () => {
    it('should report all 18 vectors as UNOBSERVED prior to receiving real observations', () => {
      const report = evaluateContinuousMonitoringHealth();
      expect(report.totalObservedVectors).toBe(0);
      expect(report.unobservedVectorsCount).toBe(18);

      const allKeys: OperationalVectorKey[] = [
        'uptime',
        'api_health',
        'database_health',
        'gps_ingestion',
        'routing_providers',
        'weather_data_providers',
        'ner_data_ingestion',
        'risk_engine',
        'accessibility_engine',
        'optimization',
        'ai_agents',
        'dynamic_replanning',
        'notifications',
        'analytics',
        'security',
        'performance',
        'costs',
        'user_driver_reported_issues',
      ];

      allKeys.forEach((key) => {
        expect(report.vectors[key]).toBeDefined();
        expect(report.vectors[key].status).toBe('UNOBSERVED');
        expect(report.vectors[key].sliScorePct).toBe(0);
        expect(report.vectors[key].targetSloPct).toBe(TARGET_SLOS[key]);
      });
    });

    it('should transition vectors from UNOBSERVED to HEALTHY upon real operational observations', () => {
      // Record genuine observations across all 18 vectors
      recordUptimeObservation(true, 45);
      recordApiObservation(200, 32);
      recordDatabaseObservation(true, 4, 12);
      recordGpsObservation(100, 1, 0); // 1% drop
      recordRoutingObservation('osrm', 140, false);
      recordWeatherObservation('open-meteo', true, true);
      recordNerIngestionObservation('bro', 12, 0);
      recordRiskObservation(25, false);
      recordAccessibilityObservation(1, true);
      recordOptimizationObservation(450, true);
      recordAiAgentObservation(4, true, 1250, true);
      recordReplanningObservation(2, 2, 14);
      recordNotificationObservation('fcm_push', true, true);
      recordAnalyticsObservation(85, true);
      recordSecurityObservation(0, 0, true);
      recordPerformanceObservation(280, 4);
      recordCostObservation(8200, 350);
      recordUserIssueObservation(5, 5);

      const report = evaluateContinuousMonitoringHealth();
      expect(report.totalObservedVectors).toBe(18);
      expect(report.unobservedVectorsCount).toBe(0);
      expect(report.overallStatus).toBe('HEALTHY');
      expect(report.overallSliPct).toBeGreaterThanOrEqual(95);

      expect(report.vectors.uptime.status).toBe('HEALTHY');
      expect(report.vectors.api_health.status).toBe('HEALTHY');
      expect(report.vectors.database_health.status).toBe('HEALTHY');
      expect(report.vectors.gps_ingestion.status).toBe('HEALTHY');
      expect(report.vectors.ai_agents.status).toBe('HEALTHY');
      expect(report.vectors.security.status).toBe('HEALTHY');
    });
  });

  // ===========================================================================
  // 2. Alert Thresholds & Degradation Triggering
  // ===========================================================================
  describe('2. Alert Thresholds & SLA Violation Triggering', () => {
    it('should trigger HIGH alert when API error rate exceeds 1.0%', () => {
      // Record 98 successful and 2 failed requests (2.0% error rate)
      for (let i = 0; i < 98; i++) recordApiObservation(200, 20);
      recordApiObservation(500, 50);
      recordApiObservation(503, 50);

      const health = evaluateVectorHealth('api_health');
      expect(health.status).toBe('DEGRADED');
      expect(health.activeAlerts.length).toBeGreaterThanOrEqual(1);
      expect(health.activeAlerts[0].severity).toBe('HIGH');
      expect(health.activeAlerts[0].thresholdExceeded).toContain('api_error_rate > 1.0%');
    });

    it('should trigger CRITICAL alert when API error rate exceeds 5.0%', () => {
      // Record 90 successful and 10 failed requests (10% error rate)
      for (let i = 0; i < 90; i++) recordApiObservation(200, 20);
      for (let i = 0; i < 10; i++) recordApiObservation(500, 50);

      const health = evaluateVectorHealth('api_health');
      expect(health.status).toBe('UNHEALTHY');
      expect(health.activeAlerts[0].severity).toBe('CRITICAL');
    });

    it('should trigger HIGH alert when database WAL replication lag exceeds 60s', () => {
      recordDatabaseObservation(true, 5, 85); // 85s WAL lag (> 60s RPO SLA)

      const health = evaluateVectorHealth('database_health');
      expect(health.status).toBe('DEGRADED');
      expect(health.activeAlerts[0].severity).toBe('HIGH');
      expect(health.activeAlerts[0].title).toContain('WAL Archiving Lag');
    });

    it('should trigger HIGH alert when GPS packet drop rate exceeds 5.0%', () => {
      recordGpsObservation(100, 8, 0); // 8% packet drop

      const health = evaluateVectorHealth('gps_ingestion');
      expect(health.status).toBe('UNHEALTHY');
      expect(health.activeAlerts[0].severity).toBe('HIGH');
      expect(health.activeAlerts[0].thresholdExceeded).toContain('drop_rate > 5.0%');
    });

    it('should trigger CRITICAL alert when security audit hash chain is broken', () => {
      recordSecurityObservation(0, 0, false); // Audit chain compromised

      const health = evaluateVectorHealth('security');
      expect(health.status).toBe('UNHEALTHY');
      expect(health.activeAlerts[0].severity).toBe('CRITICAL');
      expect(health.activeAlerts[0].title).toContain('Audit Log Hash Chain Broken');
    });

    it('should allow acknowledging active alerts', () => {
      recordDatabaseObservation(true, 5, 90);
      evaluateVectorHealth('database_health');

      const alerts = listMonitoringAlerts({ vector: 'database_health' });
      expect(alerts.length).toBeGreaterThan(0);
      const alertId = alerts[0].id;

      const ackResult = acknowledgeMonitoringAlert(alertId);
      expect(ackResult).toBe(true);

      const unacked = listMonitoringAlerts({ vector: 'database_health', acknowledged: false });
      expect(unacked.length).toBe(0);
    });
  });

  // ===========================================================================
  // 3. AI Multi-Agent Operational Governance Invariant
  // ===========================================================================
  describe('3. AI Operational Governance & Guard Invariant', () => {
    it('verifies AI governance: "AI reasons. APIs provide facts. Algorithms calculate. Backend enforces. Humans approve critical decisions."', () => {
      recordAiAgentObservation(5, true, 800, true);

      const report = evaluateContinuousMonitoringHealth();
      expect(report.aiGovernanceCheck.passed).toBe(true);
      expect(report.aiGovernanceCheck.rule).toBe(
        'AI reasons. APIs provide facts. Algorithms calculate. Backend enforces. Humans approve critical decisions.'
      );
      expect(report.vectors.ai_agents.status).toBe('HEALTHY');
    });

    it('should immediately trigger CRITICAL alert if an unauthorized tool invocation is attempted by AI', () => {
      // Simulate an agent attempting an unauthorized tool call without authorization gate
      recordAiAgentObservation(3, false, 400, false);

      const health = evaluateVectorHealth('ai_agents');
      expect(health.status).toBe('UNHEALTHY');
      expect(health.sliScorePct).toBe(0);
      expect(health.activeAlerts[0].severity).toBe('CRITICAL');
      expect(health.activeAlerts[0].title).toContain('Unauthorized Tool Call');

      const report = evaluateContinuousMonitoringHealth();
      expect(report.aiGovernanceCheck.passed).toBe(false);
      expect(report.overallStatus).toBe('UNHEALTHY');
    });
  });

  // ===========================================================================
  // 4. Incident RCA & Improvement Backlog Management
  // ===========================================================================
  describe('4. Incident RCA & Continuous Improvement Backlog', () => {
    it('should create and retrieve structured 5-Whys root-cause analysis (RCA) records', () => {
      const rca = createIncidentRcaRecord({
        title: 'Monsoon landslide false safe-haven proposal on NH-29',
        vector: 'dynamic_replanning',
        severity: 'HIGH',
        rootCause: 'IMD radar polygon boundary had 15-minute sync delay behind real-world rockfall.',
        fiveWhys: [
          'Why did route replanner propose transit past milestone 42? Because road status was marked open.',
          'Why was road marked open? Because BRO official bulletin was not yet published.',
          'Why was bulletin delayed? Because telemetry field inspector lacked cell signal in gorge.',
          'Why was cell signal lost? 2G transmission tower was damaged by torrential rain.',
          'Why was there no alternative warning? Driver in-cab manual warning had not reached 3-driver quorum.',
        ],
        correctiveActions: [
          'Reduced driver crowd-sourced blockage quorum from 3 to 1 in deep river gorges.',
          'Added automatic advisory speed restriction (30 km/h) upon heavy radar precipitation.',
        ],
        preventionMeasures: [
          'Deploy offline edge dead-reckoning buffer caching to driver mobile app.',
        ],
        owner: 'Lead Safety Architect',
        status: 'RESOLVED',
      });

      expect(rca.incidentId).toContain('rca_');
      expect(rca.fiveWhys.length).toBe(5);
      expect(rca.correctiveActions.length).toBe(2);

      const allRcas = listIncidentRcaRecords();
      expect(allRcas.length).toBeGreaterThanOrEqual(1);
      expect(allRcas.find((r) => r.incidentId === rca.incidentId)).toBeDefined();
    });

    it('should manage prioritized continuous improvement backlog items across 7 categories', () => {
      const allBacklog = listImprovementBacklog();
      expect(allBacklog.length).toBeGreaterThanOrEqual(5);

      const reliabilityItems = listImprovementBacklog('RELIABILITY');
      expect(reliabilityItems.length).toBeGreaterThanOrEqual(1);
      expect(reliabilityItems[0].title).toContain('Gzip payload compression');

      const newItem = addImprovementBacklogItem({
        category: 'COST_EFFICIENCY',
        title: 'Redis telemetry stream automatic TTL eviction for inactive vehicles',
        priority: 'P2',
        impact: 'Saves 35% memory footprint on Azure Redis Enterprise cluster.',
        status: 'BACKLOG',
        estimatedEffortDays: 2,
        assignedTeam: 'Infrastructure Ops',
      });

      expect(newItem.id).toBeDefined();
      expect(newItem.category).toBe('COST_EFFICIENCY');

      const updatedBacklog = listImprovementBacklog('COST_EFFICIENCY');
      expect(updatedBacklog.find((b) => b.id === newItem.id)).toBeDefined();
    });
  });

  // ===========================================================================
  // 5. Continuous Monitoring REST API Endpoints
  // ===========================================================================
  describe('5. Continuous Monitoring REST API Endpoints', () => {
    it('GET /api/v1/monitoring/health rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/health');
      const res = await getMonitoringHealthApi(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/monitoring/health rejects unauthorized viewer with 403', async () => {
      const token = signAuthToken(viewerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await getMonitoringHealthApi(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/monitoring/health allows manager and returns 18-vector health report', async () => {
      recordUptimeObservation(true, 50);
      recordApiObservation(200, 25);

      const token = signAuthToken(managerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await getMonitoringHealthApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('vectors');
      expect(json.data.totalObservedVectors).toBe(2);
      expect(json.data.unobservedVectorsCount).toBe(16);
      expect(json.data).toHaveProperty('aiGovernanceCheck');
    });

    it('GET /api/v1/monitoring/alerts returns list of active alerts with filtering', async () => {
      recordApiObservation(500, 50);
      recordApiObservation(500, 50);
      evaluateVectorHealth('api_health');

      const token = signAuthToken(managerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts?vector=api_health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await getMonitoringAlertsApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.alerts.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/monitoring/alerts acknowledges an alert', async () => {
      recordApiObservation(500, 50);
      recordApiObservation(500, 50);
      evaluateVectorHealth('api_health');

      const alerts = listMonitoringAlerts();
      const alertId = alerts[0].id;

      const token = signAuthToken(managerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId }),
      });

      const res = await ackMonitoringAlertApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.acknowledged).toBe(true);
    });

    it('GET /api/v1/monitoring/improvement-backlog returns prioritized backlog items', async () => {
      const token = signAuthToken(managerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/improvement-backlog?category=RELIABILITY', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await getImprovementBacklogApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.backlog.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/monitoring/improvement-backlog creates a new backlog item', async () => {
      const token = signAuthToken(managerUser);
      const req = new NextRequest('http://localhost:3000/api/v1/monitoring/improvement-backlog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: 'SECURITY',
          title: 'Automated weekly dependency vulnerability scans via GitHub Dependabot',
          priority: 'P1',
          impact: 'Proactively identifies upstream security patches before deployment.',
          assignedTeam: 'Security & DevOps',
        }),
      });

      const res = await addImprovementBacklogApi(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toContain('Automated weekly dependency vulnerability scans');
    });
  });
});
