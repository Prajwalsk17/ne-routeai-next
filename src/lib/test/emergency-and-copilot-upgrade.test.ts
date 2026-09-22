/**
 * NER-RouteAI — Emergency Mission & AI Copilot Functional Verification Suite
 * 
 * Tests the complete functional repair and upgrade:
 * 1. Emergency Mission Workflow (Accept Plan, Modify, Override, Action Execution, Audit Trail)
 * 2. Truthful external dispatch reporting
 * 3. AI Copilot 15 Section 27 test cases
 * 4. Grounded application context and non-hallucinatory boundaries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMission,
  listMissions,
  saveMission,
  acceptMission,
  modifyMission,
  overrideMission,
  executeAction,
  getActiveEmergencyCount,
  resetEmergencyStoreForTesting,
} from '@/lib/services/emergency.service';
import { optimizeEmergencyMission } from '@/lib/engines/emergency-engine';
import {
  detectIntent,
  executeCopilotReasoning,
  toolGetRouteRisk,
  toolGetWeather,
  toolGetAffectedCorridors,
  toolGetEmergencyMissions,
  toolCalculateAlternativeRoute,
} from '@/lib/engines/copilot-engine';

describe('1. Emergency Mission Workflow Engine', () => {
  beforeEach(() => {
    resetEmergencyStoreForTesting();
  });

  it('generates structured EmergencyAction items with comprehensive fields', () => {
    const result = optimizeEmergencyMission({
      mission_type: 'Medical',
      origin_id: 'LOC001',
      destination_id: 'LOC025',
      cargo_type: 'Emergency Medicine',
      cargo_weight_kg: 500,
      priority: 'CRITICAL',
    });

    expect(result.mission_id).toMatch(/^MIS-EM-/);
    expect(result.status).toBe('PENDING');
    expect(result.actions).toBeDefined();
    expect(result.actions.length).toBeGreaterThanOrEqual(5);

    // Verify first action has all required fields (Section 1)
    const action = result.actions[0];
    expect(action.id).toBe('EM-001');
    expect(action.title).toBeDefined();
    expect(action.description).toBeDefined();
    expect(action.priority).toBe('CRITICAL');
    expect(action.severity).toBe('SEVERE');
    expect(action.corridor).toContain('NH-13');
    expect(action.region).toBeDefined();
    expect(action.reason).toBeDefined();
    expect(action.impact).toBeDefined();
    expect(action.responsibleAgency).toBeDefined();
    expect(action.resources.length).toBeGreaterThan(0);
    expect(action.status).toBe('PENDING');
    expect(action.confidence).toBeGreaterThan(0.8);
    expect(action.source).toBeDefined();
    expect(action.timestamp).toBeDefined();

    // Verify audit log initialized
    expect(result.audit_log).toBeDefined();
    expect(result.audit_log.length).toBe(1);
    expect(result.audit_log[0].action).toBe('CREATED');
  });

  it('accepts plan, validates state transition PENDING -> ACCEPTED, and blocks duplicate acceptance (Section 2)', async () => {
    const missionId = 'MIS-EM-001004';
    const acceptRes = await acceptMission(missionId, 'Captain R. Barua');

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.mission?.status).toBe('ACCEPTED');
    expect(acceptRes.mission?.accepted_at).toBeDefined();

    // Verify actions transitioned
    expect(acceptRes.mission?.actions[0].status).toBe('ACCEPTED');

    // Verify audit trail logged
    const latestAudit = acceptRes.mission?.audit_log[0];
    expect(latestAudit?.action).toBe('ACCEPTED');
    expect(latestAudit?.actor).toBe('Captain R. Barua');

    // Prevent duplicate acceptance (Section 2 #10)
    const duplicateRes = await acceptMission(missionId, 'Another Operator');
    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain('Duplicate acceptance prevented');
  });

  it('modifies plan parameters, updates state to MODIFIED, and records audit trail (Section 3)', async () => {
    const missionId = 'MIS-EM-001004';
    const modRes = await modifyMission(
      missionId,
      {
        priority: 'CRITICAL',
        corridor: 'NH-13 via Kalaktang Bypass Detour',
        notes: 'Diverted around Bhalukpong active rockfall section.',
      },
      'Duty Officer Sharma'
    );

    expect(modRes.success).toBe(true);
    expect(modRes.mission?.status).toBe('MODIFIED');
    expect(modRes.mission?.corridor_affected).toBe('NH-13 via Kalaktang Bypass Detour');
    expect(modRes.mission?.modified_at).toBeDefined();

    const auditEntry = modRes.mission?.audit_log[0];
    expect(auditEntry?.action).toBe('MODIFIED');
    expect(auditEntry?.actor).toBe('Duty Officer Sharma');
    expect(auditEntry?.details).toContain('Diverted around Bhalukpong');
  });

  it('applies operator override with reason and justification, setting status to OVERRIDDEN (Section 4)', async () => {
    const missionId = 'MIS-EM-001004';
    const overrideRes = await overrideMission(
      missionId,
      {
        reason: 'Severe Local Weather Change',
        justification: 'Blizzard conditions at Sela Pass exceed 40 knots wind shear.',
        decision: 'Hold convoy at Tezpur and prepare tactical helicopter dispatch at dawn.',
      },
      'Major K. Singh'
    );

    expect(overrideRes.success).toBe(true);
    expect(overrideRes.mission?.status).toBe('OVERRIDDEN');
    expect(overrideRes.mission?.override_info).toBeDefined();
    expect(overrideRes.mission?.override_info?.reason).toBe('Severe Local Weather Change');
    expect(overrideRes.mission?.override_info?.operator).toBe('Major K. Singh');

    // Verify audit log has complete record
    const auditEntry = overrideRes.mission?.audit_log[0];
    expect(auditEntry?.action).toBe('OVERRIDDEN');
    expect(auditEntry?.reason).toBe('Severe Local Weather Change');
  });

  it('truthfully reports external agency integration requirement on action execution (Section 5)', async () => {
    const missionId = 'MIS-EM-001004';

    // EM-002: Request helicopter support (IAF)
    const execRes = await executeAction(missionId, 'EM-002', 'Duty Dispatcher');
    expect(execRes.success).toBe(true);
    expect(execRes.isExternalAgency).toBe(true);
    expect(execRes.notice).toContain('Action prepared — external agency integration required for automatic dispatch');
    expect(execRes.action?.status).toBe('EXECUTING');

    // EM-001: Corridor avoidance (internal routing)
    const execInternal = await executeAction(missionId, 'EM-001', 'Duty Dispatcher');
    expect(execInternal.success).toBe(true);
    expect(execInternal.isExternalAgency).toBe(false);
    expect(execInternal.notice).toContain('Corridor exclusion active');
  });
});

describe('2. AI Copilot Intelligence Architecture & 15 Test Cases (Section 27)', () => {
  it('correctly classifies intent across different query categories (Section 7)', () => {
    expect(detectIntent('What is the safest available route from Guwahati to Tawang?')).toBe('ROUTE_OPTIMIZATION');
    expect(detectIntent('Why did you select this route?')).toBe('ROUTE_OPTIMIZATION');
    expect(detectIntent('Which risks are currently affecting my route?')).toBe('RISK_ANALYSIS');
    expect(detectIntent('What is the weather like on Sela Pass?')).toBe('WEATHER');
    expect(detectIntent('How can I deliver essential cargo to an isolated community?')).toBe('ACCESSIBILITY');
    expect(detectIntent('Show me the active emergency missions')).toBe('EMERGENCY_RESPONSE');
    expect(detectIntent('Explain multimodal logistics')).toBe('TRANSPORT');
    expect(detectIntent('How does NER-RouteAI work?')).toBe('TECHNICAL_HELP');
    expect(detectIntent('Tell me a recipe for chocolate cake')).toBe('UNKNOWN');
  });

  // Test Case 1
  it('handles Test Case 1: "What is the safest available route from Guwahati to Tawang?"', async () => {
    const res = await executeCopilotReasoning('What is the safest available route from Guwahati to Tawang?');
    expect(res.response).toContain('NH-13');
    expect(res.response).toContain('Recommendation:');
    expect(res.response).toContain('Reason:');
    expect(res.response).toContain('Risk:');
    expect(res.response).toContain('Alternative:');
    expect(res.response).toContain('Action:');
    expect(res.response).toContain('AI-generated recommendation — verify with authorized authorities');
    expect(res.cards?.length).toBeGreaterThan(0);
    expect(res.cards?.[0].type).toBe('route');
  });

  // Test Case 2
  it('handles Test Case 2: "Why did you select this route?"', async () => {
    const res = await executeCopilotReasoning('Why did you select this route?');
    expect(res.response).toContain('Route Selection Justification');
    expect(res.response).toContain('Road Surface');
    expect(res.response).toContain('Landslide Safety');
    expect(res.cards?.length).toBeGreaterThan(0);
  });

  // Test Case 3
  it('handles Test Case 3: "What happens if this road becomes unavailable?"', async () => {
    const res = await executeCopilotReasoning('What happens if this road becomes unavailable?');
    expect(res.response).toContain('Corridor Failure Contingency Protocol');
    expect(res.response).toContain('Rerouting');
    expect(res.response).toContain('Multimodal Escalation');
  });

  // Test Case 4
  it('handles Test Case 4: "Find an alternative route."', async () => {
    const res = await executeCopilotReasoning('Find an alternative route.');
    expect(res.response).toContain('Alternative Route Analysis');
    expect(res.response).toContain('Trade-Off Comparison');
    expect(res.cards?.[0].badge).toBe('ALTERNATIVE');
  });

  // Test Case 5
  it('handles Test Case 5: "Which risks are currently affecting my route?"', async () => {
    const res = await executeCopilotReasoning('Which risks are currently affecting my route?');
    expect(res.response).toContain('Active Hazards on Monitored Corridors');
    expect(res.response).toContain('Landslide Susceptibility');
    expect(res.cards?.[0].type).toBe('risk');
  });

  // Test Case 6
  it('handles Test Case 6: "Explain the risk score."', async () => {
    const res = await executeCopilotReasoning('Explain the risk score.');
    expect(res.response).toContain('Risk Score Calculation Methodology');
    expect(res.response).toContain('Road Surface & Infrastructure');
    expect(res.response).toContain('Disaster & Geological Exposure');
  });

  // Test Case 7
  it('handles Test Case 7: "How can I deliver essential cargo to an isolated community?"', async () => {
    const res = await executeCopilotReasoning('How can I deliver essential cargo to an isolated community?');
    expect(res.response).toContain('Delivery Strategy for Isolated Mountain Communities');
    expect(res.response).toContain('Hub-and-Spoke Transshipment');
    expect(res.response).toContain('4x4');
  });

  // Test Case 8
  it('handles Test Case 8: "What transport modes can be used here?"', async () => {
    const res = await executeCopilotReasoning('What transport modes can be used here?');
    expect(res.response).toContain('Operational Transport Modes in Northeast India');
    expect(res.response).toContain('Heavy Commercial Road Freight');
    expect(res.response).toContain('Inland Waterways');
    expect(res.response).toContain('Air Logistics');
  });

  // Test Case 9
  it('handles Test Case 9: "Explain multimodal logistics."', async () => {
    const res = await executeCopilotReasoning('Explain multimodal logistics.');
    expect(res.response).toContain('Multimodal Logistics in Northeast India');
    expect(res.response).toContain('Brahmaputra River Highway');
    expect(res.response).toContain('Rail-to-Road');
  });

  // Test Case 10
  it('handles Test Case 10: "What should we do during a landslide?"', async () => {
    const res = await executeCopilotReasoning('What should we do during a landslide?');
    expect(res.response).toContain('Standard Operating Procedure: Landslide Encounter');
    expect(res.response).toContain('Halt immediately');
    expect(res.response).toContain('Border Roads Organisation');
  });

  // Test Case 11
  it('handles Test Case 11: "Show me the active emergency missions."', async () => {
    const res = await executeCopilotReasoning('Show me the active emergency missions.');
    expect(res.response).toContain('Active Emergency Missions');
    expect(res.cards?.[0].type).toBe('emergency');
  });

  // Test Case 12
  it('handles Test Case 12: "Why is this corridor being avoided?"', async () => {
    const res = await executeCopilotReasoning('Why is this corridor being avoided?');
    expect(res.response).toContain('Restricted Corridors & Avoidance Reasons');
    expect(res.response).toContain('NH-13');
  });

  // Test Case 13
  it('handles Test Case 13: "How does NER-RouteAI work?"', async () => {
    const res = await executeCopilotReasoning('How does NER-RouteAI work?');
    expect(res.response).toContain('NER-RouteAI Architecture & Operation');
    expect(res.response).toContain('OSRM Road Graph Engine');
    expect(res.response).toContain('Multi-Criteria Optimization Engine');
  });

  // Test Case 14
  it('handles Test Case 14: "What is the purpose of Accessibility Radar?"', async () => {
    const res = await executeCopilotReasoning('What is the purpose of Accessibility Radar?');
    expect(res.response).toContain('Purpose of Accessibility Radar');
    expect(res.response).toContain('Single-Point-of-Failure Roads');
    expect(res.response).toContain('KNOWN');
  });

  // Test Case 15
  it('handles Test Case 15: "Tell me something unrelated to logistics."', async () => {
    const res = await executeCopilotReasoning('Tell me something unrelated to logistics.');
    expect(res.intent).toBe('UNKNOWN');
    expect(res.response).toContain("For this question I don't have reliable application data");
    expect(res.response).not.toContain('fabricated');
  });
});
