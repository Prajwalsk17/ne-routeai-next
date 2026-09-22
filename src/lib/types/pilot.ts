/**
 * AuraNER / NER-Route AI — Phase 26: Field Pilot Domain Types
 * 
 * Defines enterprise contracts and structures for the controlled real-world field pilot:
 * - Pilot cohort whitelisting & boundary gating
 * - Driver and dispatcher in-field usability feedback
 * - Field operational incident tracking & escalation workflows
 * - 9-vector operational health and reliability monitoring
 * - Subsystem-by-subsystem pilot readiness evaluations
 */

import { Coordinates } from '@/lib/providers/types';

export type PilotCohortStatus = 'ACTIVE' | 'PAUSED' | 'CONCLUDED';

export interface PilotCohort {
  id: string;
  organizationId: string;
  name: string;
  state: string;
  authorizedCorridors: string[]; // e.g. ['NH-27', 'NH-29', 'NH-6']
  authorizedVehicleIds: string[];
  authorizedDriverIds: string[];
  maxActiveTrips: number;
  status: PilotCohortStatus;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export type PilotFeedbackCategory =
  | 'GPS_ACCURACY'
  | 'ROUTE_NAVIGATION'
  | 'HAZARD_ALERT'
  | 'APP_USABILITY'
  | 'AI_ADVICE'
  | 'CONNECTIVITY'
  | 'OFFLINE_SYNC'
  | 'OTHER';

export interface PilotFeedback {
  id: string;
  organizationId: string;
  reporterId: string;
  reporterName: string;
  reporterRole: 'DRIVER' | 'DISPATCHER' | 'LOGISTICS_MANAGER' | 'VIEWER' | 'ADMIN';
  category: PilotFeedbackCategory;
  rating: number; // 1 to 5 stars
  comment: string;
  tripId?: string | null;
  vehicleId?: string | null;
  coordinates?: Coordinates | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PilotIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PilotIncidentCategory =
  | 'SYSTEM_CRASH'
  | 'TELEMETRY_OUTAGE'
  | 'INCORRECT_ROUTING'
  | 'SAFETY_VIOLATION'
  | 'DATA_MISMATCH'
  | 'HARDWARE_FAILURE'
  | 'NETWORK_OFFLINE';

export type PilotIncidentStatus =
  | 'REPORTED'
  | 'TRIAGED'
  | 'INVESTIGATING'
  | 'PATCHED'
  | 'RESOLVED'
  | 'CLOSED';

export interface PilotIncident {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  severity: PilotIncidentSeverity;
  category: PilotIncidentCategory;
  status: PilotIncidentStatus;
  reportedBy: string;
  assignedTo?: string | null;
  affectedCorridor?: string | null;
  affectedVehicleId?: string | null;
  affectedTripId?: string | null;
  rootCause?: string | null;
  resolution?: string | null;
  resolutionSlaHours: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface PilotOperationalMetrics {
  gpsReliability: {
    totalPings: number;
    deadReckoningPings: number;
    jitterAvgMeters: number;
    packetDropRatePct: number;
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNACCEPTABLE';
  };
  routingReliability: {
    totalRoutesCalculated: number;
    offRouteDeviations: number;
    severeGradientAvoidances: number;
    etaDeviationMinutesAvg: number;
  };
  notificationDelivery: {
    totalAttempted: number;
    deliveredCount: number;
    deliveryRatePct: number;
    avgLatencyMs: number;
    failedRetries: number;
  };
  aiAssistance: {
    totalInvocations: number;
    completedCount: number;
    humanApprovalPending: number;
    approvedCount: number;
    rejectedCount: number;
    rejectionRatePct: number;
    groundingViolations: number;
  };
  operationalUsability: {
    totalFeedbackSubmissions: number;
    avgRating: number;
    driverSatisfactionScorePct: number;
    dispatcherSatisfactionScorePct: number;
    topPainPoints: { category: PilotFeedbackCategory; count: number }[];
  };
  incidentSummary: {
    totalReported: number;
    openCount: number;
    resolvedCount: number;
    criticalCount: number;
    avgResolutionHours: number;
  };
  performanceSummary: {
    apiRequestsTotal: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRatePct: number;
  };
  asOf: string;
}

export interface PilotSubsystemReadiness {
  subsystem: string;
  ready: boolean;
  score: number; // 0 to 100
  prerequisitesMet: string[];
  blockers?: string[];
  warnings?: string[];
}

export interface PilotReadinessReport {
  overallReady: boolean;
  overallScore: number; // 0 to 100
  activeCohortsCount: number;
  subsystems: Record<string, PilotSubsystemReadiness>;
  criticalBlockers: string[];
  recommendedActions: string[];
  evaluatedAt: string;
}
