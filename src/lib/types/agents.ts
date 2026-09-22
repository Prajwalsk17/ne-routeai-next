/**
 * AuraNER / NER-Route AI — Production AI Agent Architecture Types
 * 
 * Defines LangGraph-compatible state graph entities, multi-agent definitions,
 * tool invocation contracts, structured reasoning outputs, and human approval checkpoints.
 */

import { Coordinates } from '@/lib/providers/types';
import { Permission } from '@/lib/auth/roles';

export type AgentName =
  | 'RISK_TRIAGE_AGENT'
  | 'AUTONOMOUS_DETOUR_AGENT'
  | 'DEMAND_ALLOCATOR_AGENT';

export type AgentTriggerEvent =
  | 'PROXIMITY_HAZARD_INTERCEPT'
  | 'HAZARD_DETECTED'
  | 'ROUTE_DEVIATION'
  | 'WEATHER_ALERT'
  | 'MONSOON_FORECAST'
  | 'INCIDENT_REPORTED'
  | 'DISPATCHER_QUERY'
  | 'MANUAL_TRIGGER'
  | 'MANUAL_INVOCATION';

export type AgentRunStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'HUMAN_APPROVAL_PENDING';

export type AgentToolName =
  | 'calculate_production_risk'
  | 'assess_accessibility'
  | 'run_optimization'
  | 'calculate_route'
  | 'scan_safe_havens'
  | 'get_vehicle_profile'
  | 'get_shipment_details';

export interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  requiredPermission: Permission;
  inputSchema: Record<string, unknown>;
  isReadOnly: boolean;
}

export interface AgentToolCall {
  id: string;
  agentRunId: string;
  toolName: AgentToolName;
  callerUserId: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  durationMs: number;
  isError: boolean;
  errorMessage?: string;
  calledAt: string;
  toolInputs?: Record<string, unknown>;
  toolOutputs?: Record<string, unknown>;
  executionDurationMs?: number;
  authorizedBy?: string;
  createdAt?: string;
}

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
}

export interface AgentHumanApproval {
  required: boolean;
  status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionTitle?: string;
  proposedAction?: string;
  impactSummary?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

// -----------------------------------------------------------------------------
// Structured Output Interfaces for Enterprise Agents
// -----------------------------------------------------------------------------

export interface RiskTriageOutput {
  incidentId?: string;
  incidentType?: string;
  verifiedSeverity?: string;
  advisoryLevel?: string;
  containmentRecommendation?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  compositeRiskScore: number;
  verificationStatus: 'CONFIRMED_BY_TOOLS' | 'UNVERIFIED' | 'FALSE_ALARM';
  affectedCorridor: string;
  primaryHazardSource: string;
  operationalImpact: string;
  recommendedAction: string;
  requiresDispatcherIntervention: boolean;
}

export interface AutonomousDetourOutput {
  tripId?: string;
  shipmentId: string;
  vehicleId: string;
  driverId: string;
  hazardDetails: {
    hazardType: string;
    distanceKm: number;
    severity: string;
  };
  originalRouteStatus: 'IMPASSABLE' | 'DEGRADED';
  recommendedDetourRouteId?: string;
  detourDistanceDeltaKm: number;
  detourEtaDeltaMinutes: number;
  safeHavenRecommendation?: {
    facilityId: string;
    facilityName: string;
    distanceKm: number;
  };
  explainabilitySummary: string;
  requiresHumanApproval: boolean;
}

export interface DemandAllocationOutput {
  region: string;
  vulnerabilityTier: string;
  highPrioritySupplies: string[];
  recommendedPrepositionHubs: Array<{
    hubId: string;
    hubName: string;
    allocatedCargoType: string;
    quantityKg: number;
  }>;
  operationalSummary: string;
}

export type AgentStructuredOutput =
  | RiskTriageOutput
  | AutonomousDetourOutput
  | DemandAllocationOutput
  | Record<string, unknown>;

// -----------------------------------------------------------------------------
// Core Agent Run Record (maps to agent_runs table)
// -----------------------------------------------------------------------------

export interface AgentRun {
  id: string;
  organizationId: string;
  agentName: AgentName;
  triggerEvent: AgentTriggerEvent;
  status: AgentRunStatus;
  contextPayload: Record<string, unknown>;
  reasoningOutput: string;
  structuredOutput: AgentStructuredOutput;
  toolCalls: AgentToolCall[];
  memoryVector: number[] | null; // 1536-dimensional vector embedding
  executionDurationMs: number;
  tokenUsage: TokenUsageMetrics;
  humanApproval: AgentHumanApproval;
  provenance: {
    model: string;
    engineVersion: string;
    hash: string;
    computedAt: string;
  };
}

// -----------------------------------------------------------------------------
// LangGraph-Style State Container
// -----------------------------------------------------------------------------

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: AgentToolName;
}

export interface AgentState {
  agentName: AgentName;
  triggerEvent: AgentTriggerEvent;
  organizationId: string;
  messages: AgentMessage[];
  context: Record<string, unknown>;
  pendingToolCalls: Array<{ name: AgentToolName; inputs: Record<string, unknown> }>;
  toolResults: Array<{ name: AgentToolName; outputs: Record<string, unknown> }>;
  currentStep: number;
  maxSteps: number;
  reasoningTrace: string[];
  structuredOutput?: AgentStructuredOutput;
  humanApprovalRequired: boolean;
  status: AgentRunStatus;
}
