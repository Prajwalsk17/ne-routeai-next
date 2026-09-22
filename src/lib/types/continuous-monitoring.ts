/**
 * AuraNER / NER-Route AI — Continuous Monitoring & Improvement Types & Contracts
 * Phase 28: Continuous Monitoring + Improvement
 *
 * Defines the operational contracts, telemetry indicators, alert thresholds,
 * incident root-cause analysis (RCA), and continuous improvement backlog.
 */

export type OperationalVectorKey =
  | 'uptime'
  | 'api_health'
  | 'database_health'
  | 'gps_ingestion'
  | 'routing_providers'
  | 'weather_data_providers'
  | 'ner_data_ingestion'
  | 'risk_engine'
  | 'accessibility_engine'
  | 'optimization'
  | 'ai_agents'
  | 'dynamic_replanning'
  | 'notifications'
  | 'analytics'
  | 'security'
  | 'performance'
  | 'costs'
  | 'user_driver_reported_issues';

export type OperationalVectorStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNOBSERVED';

export type MonitoringAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface MonitoringAlert {
  id: string;
  vector: OperationalVectorKey;
  severity: MonitoringAlertSeverity;
  title: string;
  message: string;
  thresholdExceeded: string;
  suggestedRemediation: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface OperationalVectorHealth {
  key: OperationalVectorKey;
  name: string;
  status: OperationalVectorStatus;
  sliScorePct: number;
  targetSloPct: number;
  metrics: Record<string, number | string | boolean>;
  activeAlerts: MonitoringAlert[];
  lastObservedAt: string;
}

export interface IncidentRcaRecord {
  incidentId: string;
  title: string;
  vector: OperationalVectorKey;
  severity: MonitoringAlertSeverity;
  rootCause: string;
  fiveWhys: string[];
  correctiveActions: string[];
  preventionMeasures: string[];
  owner: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  detectedAt: string;
  resolvedAt?: string;
}

export interface ImprovementBacklogItem {
  id: string;
  category:
    | 'PERFORMANCE'
    | 'RELIABILITY'
    | 'SECURITY'
    | 'AI_GOVERNANCE'
    | 'DATA_QUALITY'
    | 'UX_ACCESSIBILITY'
    | 'COST_EFFICIENCY';
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  impact: string;
  status: 'BACKLOG' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  estimatedEffortDays: number;
  assignedTeam: string;
  createdAt: string;
}

export interface ContinuousMonitoringHealthReport {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  overallSliPct: number;
  totalObservedVectors: number;
  unobservedVectorsCount: number;
  activeAlertsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  vectors: Record<OperationalVectorKey, OperationalVectorHealth>;
  aiGovernanceCheck: {
    passed: boolean;
    rule: string;
    details: string;
  };
  timestamp: string;
}
