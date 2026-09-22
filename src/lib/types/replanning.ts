/**
 * AuraNER / NER-Route AI — Phase 19: Dynamic Replanning Domain Types
 * 
 * Defines data structures for dynamic detection, alternative route calculation,
 * constraint verification, immutable route versioning, and human approval gating.
 */

import { Coordinates } from '@/lib/providers/types';

export type ReplanningTriggerType =
  | 'GPS_DEVIATION'
  | 'ROAD_HAZARD_BLOCKAGE'
  | 'SEVERE_WEATHER_ALERT'
  | 'RISK_SURGE'
  | 'CONSIGNMENT_CHANGE'
  | 'VEHICLE_CONSTRAINT_VIOLATION'
  | 'MANUAL_DISPATCHER_REQUEST';

export type ReplanningStatus =
  | 'ANALYZING'
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'FAILED';

export type ReplanningApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export interface ReplanningImpactAnalysis {
  originalDistanceKm: number;
  newDistanceKm: number;
  distanceDeltaKm: number;
  originalEtaMinutes: number;
  newEtaMinutes: number;
  etaDeltaMinutes: number;
  originalRiskScore: number;
  newRiskScore: number;
  riskDelta: number;
  avoidedHazardsCount: number;
  safeHavensIdentified: number;
}

export interface ReplanningConstraintValidation {
  isVehicleCompatible: boolean;
  maxGradientSatisfied: boolean;
  coldChainSatisfied: boolean;
  curfewSatisfied: boolean;
  driverDutySatisfied: boolean;
  violations: string[];
}

export interface ReplanningChangeExplanation {
  summary: string;
  triggerReason: string;
  tradeoffAnalysis: string;
  operationalActionRequired: string;
}

export interface ReplanningProposal {
  id: string;
  organizationId: string;
  tripId: string;
  routeId: string;
  currentRouteVersionId: string;
  candidateRouteVersionId?: string;
  candidateRouteGeometry?: [number, number][]; // [lng, lat][]
  triggerType: ReplanningTriggerType;
  triggerSourceId?: string;
  triggerCoordinates?: Coordinates;
  status: ReplanningStatus;
  requiresHumanApproval: boolean;
  approvalStatus: ReplanningApprovalStatus;
  approvalMetadata?: {
    approvedBy?: string | null;
    approvedAt?: string | null;
    rejectionReason?: string | null;
    comments?: string;
  };
  impactAnalysis: ReplanningImpactAnalysis;
  constraintValidation: ReplanningConstraintValidation;
  changeExplanation: ReplanningChangeExplanation;
  provenance: {
    evaluatedAt: string;
    recalculationEngine: string;
    hash: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EvaluateReplanningParams {
  trip_id: string;
  trigger_type: ReplanningTriggerType;
  trigger_source_id?: string;
  current_location?: Coordinates;
  avoid_coordinates?: Coordinates[];
  reason?: string;
  force_human_approval?: boolean;
}

export interface ReplanningQueryFilter {
  trip_id?: string;
  trigger_type?: string;
  status?: string;
  requires_human_approval?: boolean;
  limit?: number;
  offset?: number;
}
