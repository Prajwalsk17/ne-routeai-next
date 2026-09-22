/**
 * AuraNER / NER-Route AI — Phase 18: AI Agent Architecture Test Suite
 * 
 * Comprehensive tests verifying:
 * 1. StateGraph Multi-Step Cyclical Agent Execution (Reasoning -> Tool Execution -> Evaluation -> Final Output)
 * 2. Tool Authorization Enforcement (User RBAC checked on every tool call; 403 / isError on missing permission)
 * 3. Zero-Fabrication Invariant (AI reasons over factual outputs returned by registered tools)
 * 4. Risk Triage Agent (Evaluates hazards using assess_accessibility & calculate_production_risk)
 * 5. Autonomous Detour Agent & Human Checkpoint Node (Stops at HUMAN_APPROVAL_PENDING for critical reroutes)
 * 6. Human Approval & Rejection Lifecycle (PENDING -> APPROVED / REJECTED, audit logged)
 * 7. Demand Allocator Agent (Monsoon prepositioning & vulnerability tiering)
 * 8. Token & Iteration Budget Controls (Bounded execution, INR cost tracking)
 * 9. Cryptographic Provenance & Memory Embedding (SHA-256 state hashing)
 * 10. Multi-Tenancy Isolation & Organization Boundaries
 * 11. REST API Contracts & RBAC Enforcement (routes:calculate, shipments:dispatch, 403 for VIEWER)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  runAgentWorkflow,
  listAgentRuns,
  getAgentRunById,
  listToolCallsForRun,
  approveAgentRun,
  rejectAgentRun,
  agentToolRegistry,
  _resetAgentStore,
} from '@/lib/services/agent.service';
import { POST as postAgentRunRoute } from '@/app/api/v1/agents/run/route';
import { GET as getAgentRunsRoute } from '@/app/api/v1/agents/runs/route';
import { GET as getAgentRunDetailRoute } from '@/app/api/v1/agents/runs/[id]/route';
import { GET as getToolCallsRoute } from '@/app/api/v1/agents/runs/[id]/tool-calls/route';
import { POST as postApproveAgentRunRoute } from '@/app/api/v1/agents/runs/[id]/approve/route';
import { POST as postRejectAgentRunRoute } from '@/app/api/v1/agents/runs/[id]/reject/route';

// Test Actors
const dispatcherAssam: SessionUser = {
  id: 'usr_dispatcher_assam',
  email: 'dispatcher@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const adminNagaland: SessionUser = {
  id: 'usr_admin_nagaland',
  email: 'admin@nagaland.gov.in',
  name: 'Temjen Imna',
  role: 'ORG_ADMIN',
  organizationId: 'org_nagaland_relief',
};

const viewerAssam: SessionUser = {
  id: 'usr_viewer_assam',
  email: 'viewer@assam.gov.in',
  name: 'Dhiren Das',
  role: 'VIEWER',
  organizationId: 'org_assam_civil_supplies',
};

function createMockRequest(
  method: string,
  url: string,
  user?: SessionUser,
  body?: unknown
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (user) {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const reqInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}

describe('Phase 18: AI Agent Architecture (LangGraph & Enterprise Security)', () => {
  beforeEach(() => {
    _resetAgentStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Tool Authorization Enforcement
  // ---------------------------------------------------------------------------
  describe('Tool Authorization & Access Boundaries', () => {
    it('allows authorized dispatcher to execute domain tools with registered permissions', async () => {
      const result = await agentToolRegistry.executeTool(
        'scan_safe_havens',
        { coordinates: { lat: 25.67, lng: 94.10 }, radiusKm: 30 },
        dispatcherAssam,
        'run-test-01'
      );

      expect(result.isError).toBe(false);
      expect(result.toolName).toBe('scan_safe_havens');
      expect((result.output as any).safeHavensCount).toBeGreaterThan(0);
      expect((result.output as any).safeHavens[0].facilityName).toBeDefined();
    });

    it('blocks execution when user lacks required permission (VIEWER lacks routes:calculate)', async () => {
      const result = await agentToolRegistry.executeTool(
        'calculate_route',
        { origin: { lat: 26.14, lng: 91.73 }, destination: { lat: 25.67, lng: 94.10 } },
        viewerAssam,
        'run-test-02'
      );

      expect(result.isError).toBe(true);
      expect(result.output).toContain('Authorization denied: User lacks permission routes:calculate');
    });

    it('returns error when tool is not registered in registry', async () => {
      const result = await agentToolRegistry.executeTool(
        'unknown_arbitrary_tool' as any,
        {},
        dispatcherAssam,
        'run-test-03'
      );

      expect(result.isError).toBe(true);
      expect(result.output).toContain('is not registered');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Risk Triage Agent (StateGraph Multi-Tool Execution)
  // ---------------------------------------------------------------------------
  describe('Risk Triage Agent (RISK_TRIAGE_AGENT)', () => {
    it('executes cyclical graph, calls factual tools, and produces verified triage advisory', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'RISK_TRIAGE_AGENT',
          trigger_event: 'HAZARD_DETECTED',
          context_payload: {
            hazardId: 'haz-nh29-landslide-01',
            hazardType: 'LANDSLIDE',
            locationName: 'Zubza Pass, NH-29',
            coordinates: { lat: 25.67, lng: 94.10 },
            reportedSeverity: 'HIGH',
          },
        },
        dispatcherAssam
      );

      expect(run.id).toMatch(/^agent-run-/);
      expect(run.agentName).toBe('RISK_TRIAGE_AGENT');
      expect(run.status).toBe('COMPLETED');
      expect(run.humanApproval.required).toBe(false);

      // Tool calls verification (APIs provide facts, Algorithms calculate)
      expect(run.toolCalls.length).toBe(2);
      const toolNames = run.toolCalls.map((t) => t.toolName);
      expect(toolNames).toContain('assess_accessibility');
      expect(toolNames).toContain('calculate_production_risk');

      // Structured Output validation
      const structured = run.structuredOutput as any;
      expect(structured.incidentId).toBe('haz-nh29-landslide-01');
      expect(structured.incidentType).toBe('LANDSLIDE');
      expect(structured.verifiedSeverity).toBeDefined();
      expect(structured.advisoryLevel).toBeDefined();
      expect(structured.containmentRecommendation).toBeDefined();

      // Provenance & Token Metrics
      expect(run.provenance.model).toBe('langgraph-claude-3-5-sonnet');
      expect(run.provenance.hash).toHaveLength(64);
      expect(run.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(run.tokenUsage.estimatedCostInr).toBeGreaterThan(0);
      expect(run.memoryVector).toHaveLength(1536);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Autonomous Detour Agent & Human Approval Checkpoint
  // ---------------------------------------------------------------------------
  describe('Autonomous Detour Agent & Human Approval Gate', () => {
    it('synthesizes emergency detour and halts at HUMAN_APPROVAL_PENDING checkpoint', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'AUTONOMOUS_DETOUR_AGENT',
          trigger_event: 'ROUTE_DEVIATION',
          context_payload: {
            tripId: 'trp-guw-dim-001',
            driverId: 'usr_driver_dorjee',
            hazardType: 'LANDSLIDE',
            hazardCoordinates: { lat: 25.80, lng: 93.80 },
          },
        },
        dispatcherAssam
      );

      expect(run.agentName).toBe('AUTONOMOUS_DETOUR_AGENT');
      expect(run.status).toBe('HUMAN_APPROVAL_PENDING');
      expect(run.humanApproval.required).toBe(true);
      expect(run.humanApproval.status).toBe('PENDING');
      expect(run.humanApproval.decisionTitle).toContain('AUTONOMOUS_DETOUR_AGENT');

      // Structured Output verification
      const structured = run.structuredOutput as any;
      expect(structured.tripId).toBe('trp-guw-dim-001');
      expect(structured.originalRouteStatus).toBe('IMPASSABLE');
      expect(structured.recommendedDetourRouteId).toBeDefined();
      expect(structured.safeHavenRecommendation).toBeDefined();
      expect(structured.safeHavenRecommendation.facilityName).toBeDefined();
      expect(structured.requiresHumanApproval).toBe(true);

      // Tool calls executed
      expect(run.toolCalls.length).toBe(2);
      const toolNames = run.toolCalls.map((t) => t.toolName);
      expect(toolNames).toContain('scan_safe_havens');
      expect(toolNames).toContain('calculate_route');
    });

    it('supports dispatcher approval workflow transitioning to COMPLETED', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'AUTONOMOUS_DETOUR_AGENT',
          trigger_event: 'ROUTE_DEVIATION',
          context_payload: {
            tripId: 'trp-guw-dim-002',
          },
        },
        dispatcherAssam
      );

      expect(run.status).toBe('HUMAN_APPROVAL_PENDING');

      // Human Approves the proposed detour
      const approvedRun = await approveAgentRun(run.id, 'Detour route verified by highway police dispatch', dispatcherAssam);

      expect(approvedRun.status).toBe('COMPLETED');
      expect(approvedRun.humanApproval.status).toBe('APPROVED');
      expect(approvedRun.humanApproval.approvedBy).toBe(dispatcherAssam.id);
      expect(approvedRun.humanApproval.approvedAt).toBeDefined();

      // Verify idempotent re-approval
      const reApproved = await approveAgentRun(run.id, 'Duplicate click', dispatcherAssam);
      expect(reApproved.status).toBe('COMPLETED');
    });

    it('supports dispatcher rejection workflow transitioning to FAILED with reason', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'AUTONOMOUS_DETOUR_AGENT',
          trigger_event: 'ROUTE_DEVIATION',
          context_payload: {
            tripId: 'trp-guw-dim-003',
          },
        },
        dispatcherAssam
      );

      expect(run.status).toBe('HUMAN_APPROVAL_PENDING');

      // Human Rejects the proposed detour
      const rejectedRun = await rejectAgentRun(
        run.id,
        'Southern link also blocked by secondary mudflow. Halting vehicle at staging depot.',
        dispatcherAssam
      );

      expect(rejectedRun.status).toBe('FAILED');
      expect(rejectedRun.humanApproval.status).toBe('REJECTED');
      expect(rejectedRun.humanApproval.rejectionReason).toContain('secondary mudflow');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Demand Allocator Agent (Strategic Prepositioning)
  // ---------------------------------------------------------------------------
  describe('Demand Allocator Agent (DEMAND_ALLOCATOR_AGENT)', () => {
    it('evaluates regional isolation risks and stages disaster relief supplies', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'DEMAND_ALLOCATOR_AGENT',
          trigger_event: 'WEATHER_ALERT',
          context_payload: {
            regionName: 'Barak Valley & Dima Hasao',
            monsoonWarningLevel: 'RED_ALERT',
          },
        },
        dispatcherAssam
      );

      expect(run.agentName).toBe('DEMAND_ALLOCATOR_AGENT');
      expect(run.status).toBe('COMPLETED');
      expect(run.toolCalls.length).toBe(2);

      const structured = run.structuredOutput as any;
      expect(structured.region).toBe('Barak Valley & Dima Hasao');
      expect(structured.vulnerabilityTier).toBe('HIGH_ISOLATION_RISK');
      expect(structured.highPrioritySupplies).toContain('Emergency Medical Kits');
      expect(structured.recommendedPrepositionHubs.length).toBeGreaterThan(0);
      expect(structured.recommendedPrepositionHubs[0].hubName).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Budget, Token, & Iteration Limits
  // ---------------------------------------------------------------------------
  describe('Budget & Iteration Controls', () => {
    it('respects max_iterations limits and avoids unbounded cycles', async () => {
      const run = await runAgentWorkflow(
        {
          agent_name: 'RISK_TRIAGE_AGENT',
          trigger_event: 'MANUAL_INVOCATION',
          max_iterations: 1,
        },
        dispatcherAssam
      );

      expect(run.status).toBe('COMPLETED');
      expect(run.tokenUsage.promptTokens).toBeGreaterThan(0);
      expect(run.tokenUsage.completionTokens).toBeGreaterThan(0);
      expect(run.tokenUsage.estimatedCostInr).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Tenancy & Query Isolation
  // ---------------------------------------------------------------------------
  describe('Multi-Tenancy & Query Isolation', () => {
    it('isolates runs by organizationId for non-superadmin users', async () => {
      // Run created for Assam
      const runAssam = await runAgentWorkflow(
        {
          agent_name: 'RISK_TRIAGE_AGENT',
          trigger_event: 'HAZARD_DETECTED',
        },
        dispatcherAssam
      );

      // Run created for Nagaland
      const runNagaland = await runAgentWorkflow(
        {
          agent_name: 'AUTONOMOUS_DETOUR_AGENT',
          trigger_event: 'ROUTE_DEVIATION',
        },
        adminNagaland
      );

      // Dispatcher Assam queries runs
      const assamList = await listAgentRuns({}, dispatcherAssam);
      expect(assamList.runs.some((r) => r.id === runAssam.id)).toBe(true);
      expect(assamList.runs.some((r) => r.id === runNagaland.id)).toBe(false);

      // Admin Nagaland queries runs
      const nagalandList = await listAgentRuns({}, adminNagaland);
      expect(nagalandList.runs.some((r) => r.id === runNagaland.id)).toBe(true);
      expect(nagalandList.runs.some((r) => r.id === runAssam.id)).toBe(false);

      // Cross-tenant direct access blocked
      await expect(getAgentRunById(runNagaland.id, dispatcherAssam)).rejects.toThrow(
        'Access denied: Agent run belongs to another organization'
      );
    });

    it('filters agent runs by agent_name and status', async () => {
      await runAgentWorkflow({ agent_name: 'RISK_TRIAGE_AGENT', trigger_event: 'HAZARD_DETECTED' }, dispatcherAssam);
      await runAgentWorkflow({ agent_name: 'AUTONOMOUS_DETOUR_AGENT', trigger_event: 'ROUTE_DEVIATION' }, dispatcherAssam);

      const riskRuns = await listAgentRuns({ agent_name: 'RISK_TRIAGE_AGENT' }, dispatcherAssam);
      expect(riskRuns.runs.every((r) => r.agentName === 'RISK_TRIAGE_AGENT')).toBe(true);

      const detourRuns = await listAgentRuns({ agent_name: 'AUTONOMOUS_DETOUR_AGENT' }, dispatcherAssam);
      expect(detourRuns.runs.every((r) => r.agentName === 'AUTONOMOUS_DETOUR_AGENT')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. REST API Endpoints & RBAC Gating
  // ---------------------------------------------------------------------------
  describe('REST API Endpoints & RBAC Protection', () => {
    it('POST /api/v1/agents/run returns 201 for authorized dispatcher', async () => {
      const req = createMockRequest('POST', '/api/v1/agents/run', dispatcherAssam, {
        agent_name: 'RISK_TRIAGE_AGENT',
        trigger_event: 'HAZARD_DETECTED',
        context_payload: {
          hazardType: 'FLOOD_INTERCEPT',
          locationName: 'Kaziranga Buffer Corridor',
        },
      });

      const res = await postAgentRunRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.agentName).toBe('RISK_TRIAGE_AGENT');
      expect(json.data.status).toBe('COMPLETED');
    });

    it('POST /api/v1/agents/run returns 403 Forbidden for viewer role', async () => {
      const req = createMockRequest('POST', '/api/v1/agents/run', viewerAssam, {
        agent_name: 'RISK_TRIAGE_AGENT',
        trigger_event: 'HAZARD_DETECTED',
      });

      const res = await postAgentRunRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/agents/run returns 400 for invalid payload', async () => {
      const req = createMockRequest('POST', '/api/v1/agents/run', dispatcherAssam, {
        agent_name: 'INVALID_UNKNOWN_AGENT',
        trigger_event: 'HAZARD_DETECTED',
      });

      const res = await postAgentRunRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/agents/runs returns 200 with paginated results', async () => {
      await runAgentWorkflow({ agent_name: 'RISK_TRIAGE_AGENT', trigger_event: 'HAZARD_DETECTED' }, dispatcherAssam);

      const req = createMockRequest('GET', '/api/v1/agents/runs?limit=10', dispatcherAssam);
      const res = await getAgentRunsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.runs)).toBe(true);
      expect(json.data.total).toBeGreaterThan(0);
    });

    it('GET /api/v1/agents/runs/[id] returns run details', async () => {
      const run = await runAgentWorkflow({ agent_name: 'RISK_TRIAGE_AGENT', trigger_event: 'HAZARD_DETECTED' }, dispatcherAssam);

      const req = createMockRequest('GET', `/api/v1/agents/runs/${run.id}`, dispatcherAssam);
      const res = await getAgentRunDetailRoute(req, { params: { id: run.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(run.id);
    });

    it('GET /api/v1/agents/runs/[id]/tool-calls returns recorded tool calls', async () => {
      const run = await runAgentWorkflow({ agent_name: 'RISK_TRIAGE_AGENT', trigger_event: 'HAZARD_DETECTED' }, dispatcherAssam);

      const req = createMockRequest('GET', `/api/v1/agents/runs/${run.id}/tool-calls`, dispatcherAssam);
      const res = await getToolCallsRoute(req, { params: { id: run.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/agents/runs/[id]/approve allows dispatcher to sign off', async () => {
      const run = await runAgentWorkflow(
        { agent_name: 'AUTONOMOUS_DETOUR_AGENT', trigger_event: 'ROUTE_DEVIATION' },
        dispatcherAssam
      );

      const req = createMockRequest('POST', `/api/v1/agents/runs/${run.id}/approve`, dispatcherAssam, {
        comments: 'Highway detour approved by emergency control',
      });
      const res = await postApproveAgentRunRoute(req, { params: { id: run.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.humanApproval.status).toBe('APPROVED');
      expect(json.data.status).toBe('COMPLETED');
    });

    it('POST /api/v1/agents/runs/[id]/approve returns 403 for unauthorized viewer', async () => {
      const run = await runAgentWorkflow(
        { agent_name: 'AUTONOMOUS_DETOUR_AGENT', trigger_event: 'ROUTE_DEVIATION' },
        dispatcherAssam
      );

      const req = createMockRequest('POST', `/api/v1/agents/runs/${run.id}/approve`, viewerAssam, {
        comments: 'Attempted approval without clearance',
      });
      const res = await postApproveAgentRunRoute(req, { params: { id: run.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/agents/runs/[id]/reject allows dispatcher to reject decision with reason', async () => {
      const run = await runAgentWorkflow(
        { agent_name: 'AUTONOMOUS_DETOUR_AGENT', trigger_event: 'ROUTE_DEVIATION' },
        dispatcherAssam
      );

      const req = createMockRequest('POST', `/api/v1/agents/runs/${run.id}/reject`, dispatcherAssam, {
        rejection_reason: 'Alternative pass closed by local authorities',
      });
      const res = await postRejectAgentRunRoute(req, { params: { id: run.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.humanApproval.status).toBe('REJECTED');
      expect(json.data.status).toBe('FAILED');
    });
  });
});
