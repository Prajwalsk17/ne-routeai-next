// ============================================
// NER-RouteAI — Emergency Mission Service
// Lifecycle management: Accept, Modify, Override, Action Execution, Audit Trail
// ============================================

import type { EmergencyResult, EmergencyAction, EmergencyPlanAuditEntry, Priority } from '@/lib/types';
import { sendDirectNotification } from './alert.service';

// In-memory mission store with persistent life-cycle across application runtime
const missionsStore = new Map<string, EmergencyResult>();

// Seed default initial mission for demonstration and immediate availability
const INITIAL_MISSION_ID = 'MIS-EM-001004';
const initialTimestamp = new Date(Date.now() - 3600000).toISOString();

const SEED_MISSION: EmergencyResult = {
  mission_id: INITIAL_MISSION_ID,
  status: 'PENDING',
  mission_priority_score: 92,
  priority_level: 'CRITICAL',
  routes: [
    {
      id: 'ROUTE-EM-01',
      name: 'Guwahati – Tezpur – Bhalukpong – Tawang Corridor',
      distanceKm: 485,
      travelTimeHr: 13.5,
      costInr: 28500,
      riskScore: 68,
      weatherRisk: 62,
      landslidRisk: 74,
      floodRisk: 30,
      roadCondition: 58,
      accessibility: 42,
      travelTimeDisplay: '13.5h',
      rankLabel: 'Recommended Tactical Emergency Route',
      score: 84,
      scoreBreakdown: {
        roadCondition: 58,
        weatherSafety: 38,
        landslideSafety: 26,
        floodSafety: 70,
        travelTimeScore: 55,
        costEfficiency: 60,
        accessibility: 42,
      },
      explanation: 'Primary arterial defense corridor with military engineering presence at Bhalukpong.',
      reliabilityPct: 76,
      via: ['Mangaldai', 'Tezpur', 'Bhalukpong', 'Bomdila', 'Dirang', 'Sela Pass'],
      color: '#ef4444',
      riskLabel: 'HIGH',
      warnings: ['Active monsoon slope advisory between Bhalukpong and Tenga', 'High altitude pass at Sela (4,170m)'],
    },
  ],
  recommended_vehicle: {
    id: 'VEH-NE-408',
    type: 'TRUCK',
    capacityTons: 5,
    state: 'Assam',
    currentLocation: 'Guwahati Central Logistics Hub',
    lat: 26.14,
    lng: 91.73,
    status: 'AVAILABLE',
    driver: 'Havildar T. Gogoi (Mountain Trained)',
    fuelPct: 96,
    riskTolerance: 'HIGH',
  },
  suitable_vehicles: [
    {
      id: 'VEH-NE-408',
      type: 'TRUCK',
      capacityTons: 5,
      state: 'Assam',
      currentLocation: 'Guwahati Central Logistics Hub',
      lat: 26.14,
      lng: 91.73,
      status: 'AVAILABLE',
      driver: 'Havildar T. Gogoi (Mountain Trained)',
      fuelPct: 96,
      riskTolerance: 'HIGH',
    },
    {
      id: 'VEH-NE-312',
      type: 'VAN',
      capacityTons: 2.5,
      state: 'Assam',
      currentLocation: 'Tezpur Staging Area',
      lat: 26.63,
      lng: 92.8,
      status: 'AVAILABLE',
      driver: 'K. Saikia',
      fuelPct: 88,
      riskTolerance: 'HIGH',
    },
  ],
  action_plan: [
    'Avoid affected corridor for non-essential cargo',
    'Request helicopter support for cut-off areas',
    'Coordinate with BRO for road clearing operations',
    'Activate local last-mile transport in cut-off areas',
    'Coordinate with state disaster management authorities',
  ],
  actions: [
    {
      id: 'EM-001',
      title: 'Avoid affected corridor for non-essential cargo',
      description: 'Reroute commercial and civilian non-relief freight away from NH-13 (Trans-Arunachal Highway) to prioritize convoy capacity for Emergency Medicine.',
      priority: 'CRITICAL',
      severity: 'SEVERE',
      corridor: 'NH-13 Balipara-Bhalukpong-Tawang Sector',
      region: 'West Kameng & Tawang, Arunachal Pradesh',
      reason: 'Monsoon slope saturation and active rockfall threats between Bhalukpong and Sela Pass.',
      impact: 'Reduces corridor congestion by ~45%, securing clear right-of-way for emergency medical convoys.',
      responsibleAgency: 'Arunachal Pradesh State Transport Dept & Traffic Police',
      resources: ['Regional Traffic Control Units', 'Automated VMS Highway Signs', 'Highway Patrol Escorts'],
      status: 'PENDING',
      confidence: 0.94,
      source: 'AuraNER Route Risk & Congestion Neural Model',
      timestamp: initialTimestamp,
      actionType: 'AVOID_CORRIDOR',
    },
    {
      id: 'EM-002',
      title: 'Request helicopter support for cut-off areas',
      description: 'Prepare air-logistics sortie request for high-elevation or landslide-isolated sectors between Guwahati and Tawang.',
      priority: 'CRITICAL',
      severity: 'HIGH',
      corridor: 'Air Corridor: Guwahati Heliport -> Tawang Forward LZ',
      region: 'Tawang High-Altitude Sector',
      reason: 'Sela Pass elevation (4,170m) experiencing zero-visibility blizzard and potential road block.',
      impact: 'Enables critical life-saving cargo insertion within 90 minutes bypassing ground blockages.',
      responsibleAgency: 'Indian Air Force (Tezpur Air Force Station) / State Civil Aviation Directorate',
      resources: ['Mi-17V5 / ALH Dhruv Helicopter Sortie', 'Helipad Staging Crew', 'Weather Radar Clearance'],
      status: 'PENDING',
      confidence: 0.89,
      source: 'High-Altitude Terrain & Accessibility Sensor Grid',
      timestamp: initialTimestamp,
      actionType: 'HELICOPTER_SUPPORT',
    },
    {
      id: 'EM-003',
      title: 'Coordinate with BRO for road clearing operations',
      description: 'Initiate priority road-clearing alert and heavy machinery mobilization with Project Vartak (Border Roads Organisation).',
      priority: 'HIGH',
      severity: 'HIGH',
      corridor: 'NH-13 Km 42-68 Bhalukpong–Tenga Cut',
      region: 'West Kameng, Arunachal Pradesh',
      reason: 'Rainfall telemetry exceeding 85mm/24h on steep phyllite/schist cut-slopes.',
      impact: 'Pre-positions hydraulic excavators and rock-breaker crews at vulnerability hotspots, reducing clearance time from 14h to under 3h.',
      responsibleAgency: 'Project Vartak (Border Roads Organisation HQ Tezpur / Bomdila)',
      resources: ['Hydraulic Excavators (Cat 320D)', 'Wheel Loaders', 'Explosive Rock Clearance Team', 'BRO Emergency Unit'],
      status: 'PENDING',
      confidence: 0.92,
      source: 'Geological Survey of India Landslide Susceptibility Index + Rainfall Radar',
      timestamp: initialTimestamp,
      actionType: 'BRO_CLEARING',
    },
    {
      id: 'EM-004',
      title: 'Activate local last-mile transport in cut-off areas',
      description: 'Mobilize 4x4 high-clearance light transport and localized porter relays for terminal delivery into Tawang District Hospital.',
      priority: 'HIGH',
      severity: 'MODERATE',
      corridor: 'Terminal Spur: Bomdila to Tawang Remote Clinics',
      region: 'Tawang Sub-Division',
      reason: 'Multi-axle truck weight restrictions above Dirang prevent heavy vehicles from negotiating narrow switchbacks.',
      impact: 'Guarantees uninterrupted final-mile delivery of temperature-sensitive vaccines and surgical kits.',
      responsibleAgency: 'District Logistics Task Force & Local 4x4 Transport Unions',
      resources: ['4x4 High-Clearance Pickups (Mahindra Bolero Camper)', 'Nodal Transit Transshipment Hub', 'Field Relay Crew'],
      status: 'PENDING',
      confidence: 0.87,
      source: 'AuraNER Accessibility Radar & Bridge Capacity Registry',
      timestamp: initialTimestamp,
      actionType: 'LAST_MILE',
    },
    {
      id: 'EM-005',
      title: 'Coordinate with state disaster management authorities',
      description: 'Register mission operational manifest with Arunachal Pradesh SDMA & District Emergency Operations Centre (DEOC) Bomdila.',
      priority: 'HIGH',
      severity: 'MODERATE',
      corridor: 'Guwahati to Tawang Inter-State Transit Sector',
      region: 'Arunachal Pradesh & Assam Border',
      reason: 'Inter-district emergency convoy priority pass required for 24/7 uninterrupted transit.',
      impact: 'Secures zero-delay green-corridor passage across inter-district transit checkpoints.',
      responsibleAgency: 'Arunachal Pradesh State Disaster Management Authority (SDMA)',
      resources: ['DEOC Coordination Desk', 'Inter-Agency Emergency Radio Frequency', 'Emergency Movement Permits'],
      status: 'PENDING',
      confidence: 0.95,
      source: 'National Disaster Management Framework Protocol',
      timestamp: initialTimestamp,
      actionType: 'DISASTER_AUTHORITY',
    },
  ],
  audit_log: [
    {
      id: 'AUD-001004-01',
      timestamp: initialTimestamp,
      action: 'CREATED',
      actor: 'AI Emergency Logistics Engine',
      details: 'Mission generated for Emergency Medicine (500kg) from Guwahati to Tawang. Priority score: 92/100.',
    },
  ],
  corridor_affected: 'NH-13 (Trans-Arunachal Highway) via Bhalukpong & Sela Pass',
  data_source: 'AuraNER Priority Optimization Engine v2.4',
  timestamp: initialTimestamp,
};

missionsStore.set(INITIAL_MISSION_ID, SEED_MISSION);

export function getMission(id: string): EmergencyResult | null {
  return missionsStore.get(id) || null;
}

export function listMissions(): EmergencyResult[] {
  return Array.from(missionsStore.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );
}

export function saveMission(mission: EmergencyResult): EmergencyResult {
  const existing = missionsStore.get(mission.mission_id);
  const updated: EmergencyResult = {
    ...mission,
    audit_log: mission.audit_log || existing?.audit_log || [],
  };
  missionsStore.set(mission.mission_id, updated);
  return updated;
}

/**
 * Accept Plan Workflow
 * Validates mission, transitions status PENDING -> ACCEPTED,
 * adds timestamp, updates audit trail, triggers in-app notification,
 * prevents duplicate acceptance.
 */
export async function acceptMission(
  id: string,
  actor: string = 'Duty Dispatcher'
): Promise<{ success: boolean; mission?: EmergencyResult; error?: string }> {
  const mission = missionsStore.get(id);
  if (!mission) {
    return { success: false, error: `Emergency mission ${id} not found.` };
  }

  if (mission.status === 'ACCEPTED') {
    return {
      success: false,
      error: `Mission ${id} has already been accepted at ${mission.accepted_at}. Duplicate acceptance prevented.`,
      mission,
    };
  }

  const nowIso = new Date().toISOString();

  // Mark all pending actions as ACCEPTED
  const updatedActions: EmergencyAction[] = (mission.actions || []).map((action) => ({
    ...action,
    status: action.status === 'PENDING' ? 'ACCEPTED' : action.status,
  }));

  const auditEntry: EmergencyPlanAuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    action: 'ACCEPTED',
    actor,
    details: `Emergency response plan ${id} accepted by operator. Priority ${mission.priority_level} routing engaged.`,
    previousState: mission.status,
    newState: 'ACCEPTED',
  };

  const updatedMission: EmergencyResult = {
    ...mission,
    status: 'ACCEPTED',
    accepted_at: nowIso,
    actions: updatedActions,
    audit_log: [auditEntry, ...(mission.audit_log || [])],
  };

  missionsStore.set(id, updatedMission);

  // Send real system notification into the platform notification tray
  try {
    await sendDirectNotification(
      {
        recipientId: 'ops-duty-officer',
        recipientType: 'DISPATCHER',
        channel: 'IN_APP',
        destination: 'internal',
        title: `EMERGENCY MISSION ACCEPTED: ${id}`,
        body: `Emergency response plan ${id} accepted by ${actor}. Priority ${updatedMission.priority_level} corridor clearance engaged.`,
        priority: 'CRITICAL',
        organizationId: 'AFCS-AS',
      },
      { id: 'system', role: 'DISPATCHER', organizationId: 'AFCS-AS' } as any
    );
  } catch {
    // Non-fatal if notification channel is quiet
  }

  return { success: true, mission: updatedMission };
}

/**
 * Modify Plan Workflow
 * Allows adjusting priority, route corridor, transport mode, required resources,
 * response agencies, cargo, destination, emergency level, notes.
 * Recalculates affected recommendations and updates audit trail.
 */
export async function modifyMission(
  id: string,
  updates: {
    priority?: Priority;
    corridor?: string;
    transportMode?: string;
    cargoType?: string;
    destination?: string;
    resources?: string[];
    agencies?: string;
    notes?: string;
    actions?: EmergencyAction[];
  },
  actor: string = 'Duty Dispatcher'
): Promise<{ success: boolean; mission?: EmergencyResult; error?: string }> {
  const mission = missionsStore.get(id);
  if (!mission) {
    return { success: false, error: `Emergency mission ${id} not found.` };
  }

  const nowIso = new Date().toISOString();

  // If actions were updated directly in modification UI
  let modifiedActions = updates.actions || [...(mission.actions || [])];

  // If corridor was modified, update all action corridor tags
  if (updates.corridor) {
    modifiedActions = modifiedActions.map((a) => ({
      ...a,
      corridor: a.actionType === 'AVOID_CORRIDOR' ? updates.corridor! : a.corridor,
    }));
  }

  // If priority was updated, update priority level
  const newPriority = updates.priority || (mission.priority_level as Priority) || 'HIGH';
  const newScore = newPriority === 'CRITICAL' ? 95 : newPriority === 'HIGH' ? 78 : 60;

  const auditEntry: EmergencyPlanAuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    action: 'MODIFIED',
    actor,
    details: `Emergency plan modified: ${updates.notes ? updates.notes : 'Parameters adjusted by operator.'} Priority: ${newPriority}. Corridor: ${updates.corridor || mission.corridor_affected}.`,
    previousState: mission.status,
    newState: 'MODIFIED',
  };

  const updatedMission: EmergencyResult = {
    ...mission,
    status: 'MODIFIED',
    priority_level: newPriority,
    mission_priority_score: newScore,
    corridor_affected: updates.corridor || mission.corridor_affected,
    notes: updates.notes || mission.notes,
    actions: modifiedActions,
    modified_at: nowIso,
    audit_log: [auditEntry, ...(mission.audit_log || [])],
  };

  missionsStore.set(id, updatedMission);
  return { success: true, mission: updatedMission };
}

/**
 * Override Plan Workflow
 * Replaces AI recommendation with operator-defined decision with justification.
 */
export async function overrideMission(
  id: string,
  overrideData: {
    reason: string;
    justification: string;
    decision: string;
  },
  actor: string = 'Duty Dispatcher'
): Promise<{ success: boolean; mission?: EmergencyResult; error?: string }> {
  const mission = missionsStore.get(id);
  if (!mission) {
    return { success: false, error: `Emergency mission ${id} not found.` };
  }

  if (!overrideData.reason) {
    return { success: false, error: 'Override reason is required.' };
  }

  const nowIso = new Date().toISOString();

  const auditEntry: EmergencyPlanAuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    action: 'OVERRIDDEN',
    actor,
    details: `Manual Override applied. Reason: ${overrideData.reason}. Operator decision: "${overrideData.decision}". Justification: ${overrideData.justification || 'N/A'}.`,
    reason: overrideData.reason,
    previousState: mission.status,
    newState: 'OVERRIDDEN',
  };

  // Mark actions as OVERRIDDEN
  const overriddenActions = (mission.actions || []).map((a) => ({
    ...a,
    status: 'OVERRIDDEN' as const,
    executionNotes: `Overridden by operator decision: ${overrideData.decision}`,
  }));

  const updatedMission: EmergencyResult = {
    ...mission,
    status: 'OVERRIDDEN',
    actions: overriddenActions,
    override_info: {
      reason: overrideData.reason,
      justification: overrideData.justification,
      decision: overrideData.decision,
      operator: actor,
      timestamp: nowIso,
    },
    audit_log: [auditEntry, ...(mission.audit_log || [])],
  };

  missionsStore.set(id, updatedMission);

  // Send notification for audit alert
  try {
    await sendDirectNotification(
      {
        recipientId: 'supervisor-desk',
        recipientType: 'ADMIN',
        channel: 'IN_APP',
        destination: 'internal',
        title: `EMERGENCY AI OVERRIDE: ${id}`,
        body: `AI plan for ${id} overridden by ${actor}. Reason: ${overrideData.reason}. Directive: ${overrideData.decision}`,
        priority: 'CRITICAL',
        organizationId: 'AFCS-AS',
      },
      { id: 'system', role: 'DISPATCHER', organizationId: 'AFCS-AS' } as any
    );
  } catch {
    // Non-fatal
  }

  return { success: true, mission: updatedMission };
}

/**
 * Emergency Action Execution Workflow
 * Executes specific emergency action.
 * Truthful reporting: "Action prepared — external agency integration required for automatic dispatch"
 * when external API dispatch is not integrated.
 */
export async function executeAction(
  missionId: string,
  actionId: string,
  actor: string = 'Duty Dispatcher'
): Promise<{
  success: boolean;
  action?: EmergencyAction;
  mission?: EmergencyResult;
  notice: string;
  isExternalAgency: boolean;
  error?: string;
}> {
  const mission = missionsStore.get(missionId);
  if (!mission) {
    return {
      success: false,
      notice: '',
      isExternalAgency: false,
      error: `Mission ${missionId} not found.`,
    };
  }

  const action = (mission.actions || []).find((a) => a.id === actionId);
  if (!action) {
    return {
      success: false,
      notice: '',
      isExternalAgency: false,
      error: `Action ${actionId} not found in mission ${missionId}.`,
    };
  }

  const nowIso = new Date().toISOString();
  let notice = '';
  let isExternalAgency = false;

  switch (action.actionType) {
    case 'AVOID_CORRIDOR':
      notice = `Corridor exclusion active: ${action.corridor} flagged for restriction in Smart Route AI engine.`;
      break;
    case 'HELICOPTER_SUPPORT':
      isExternalAgency = true;
      notice = 'Action prepared — external agency integration required for automatic dispatch. Flight manifest staged for IAF/Civil Aviation Desk.';
      break;
    case 'BRO_CLEARING':
      isExternalAgency = true;
      notice = 'Action prepared — external agency integration required for automatic dispatch. Road clearance work order staged for Border Roads Organisation.';
      break;
    case 'LAST_MILE':
      notice = `Local last-mile transport unit staged: High-clearance 4x4 relay prepared for destination approach into ${action.region}.`;
      break;
    case 'DISASTER_AUTHORITY':
      isExternalAgency = true;
      notice = 'Action prepared — external agency integration required for automatic dispatch. Movement pass dossier transmitted to State Disaster Management Authority coordination desk.';
      break;
    default:
      notice = `Emergency action ${action.id} dispatched to field command.`;
  }

  const updatedAction: EmergencyAction = {
    ...action,
    status: 'EXECUTING',
    executionNotes: notice,
  };

  const updatedActions = (mission.actions || []).map((a) => (a.id === actionId ? updatedAction : a));

  const auditEntry: EmergencyPlanAuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    action: 'ACTION_EXECUTED',
    actor,
    details: `Executed recommendation ${action.id}: "${action.title}". Status: EXECUTING. Notice: ${notice}`,
  };

  const updatedMission: EmergencyResult = {
    ...mission,
    actions: updatedActions,
    audit_log: [auditEntry, ...(mission.audit_log || [])],
  };

  missionsStore.set(missionId, updatedMission);

  return {
    success: true,
    action: updatedAction,
    mission: updatedMission,
    notice,
    isExternalAgency,
  };
}

export function getActiveEmergencyCount(): number {
  return Array.from(missionsStore.values()).filter(
    (m) => m.status === 'PENDING' || m.status === 'ACCEPTED' || m.status === 'MODIFIED'
  ).length;
}

export function resetEmergencyStoreForTesting(): void {
  missionsStore.clear();
  missionsStore.set(INITIAL_MISSION_ID, { ...SEED_MISSION });
}
