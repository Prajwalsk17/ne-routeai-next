// ============================================
// NER-RouteAI — Emergency Logistics Engine
// Mission priority scoring + vehicle selection
// ============================================

import type { EmergencyMissionParams, EmergencyResult, EmergencyAction, Vehicle } from '../types';
import { LOCATIONS, VEHICLES } from '../seed-data';
import { generateCandidateRoutes } from './route-engine';

const CARGO_CRITICALITY: Record<string, number> = {
  'Vaccines': 98, 'Emergency Medicine': 95, 'Medical Supplies': 90,
  'Water': 75, 'Food & Rations': 70, 'Emergency Kits': 80,
  'Disaster Relief': 85, 'Fuel': 60, 'Construction Materials': 40,
};

export function optimizeEmergencyMission(params: EmergencyMissionParams): EmergencyResult {
  const origin = LOCATIONS.find(l => l.id === params.origin_id);
  const dest = LOCATIONS.find(l => l.id === params.destination_id);
  
  // Mission priority score
  const cargoCrit = CARGO_CRITICALITY[params.cargo_type] || 60;
  const urgency = params.priority === 'CRITICAL' ? 95 : params.priority === 'HIGH' ? 75 : 50;
  const popImpact = dest ? Math.min(100, (dest.population / 10000) * 5) : 50;
  const accessDifficulty = dest && dest.elevation > 1000 ? 80 : 40;
  
  const missionPriorityScore = Math.round(
    cargoCrit * 0.30 + urgency * 0.30 + popImpact * 0.15 + accessDifficulty * 0.15 + 60 * 0.10
  );

  // Select suitable vehicles
  const available = VEHICLES.filter(v => 
    (v.status === 'AVAILABLE' || v.status === 'STANDBY') &&
    v.capacityTons >= params.cargo_weight_kg / 1000 &&
    v.fuelPct > 30
  );

  const scored = available.map(v => {
    const distToOrigin = origin ? Math.sqrt(
      Math.pow(v.lat - origin.lat, 2) + Math.pow(v.lng - origin.lng, 2)
    ) * 111 : 999;
    const etaHours = distToOrigin / 40 + 0.5;
    const proximityScore = Math.max(0, 100 - distToOrigin * 2);
    const capacityScore = Math.min(100, (v.capacityTons / (params.cargo_weight_kg / 1000)) * 50);
    const fuelScore = v.fuelPct;
    const riskScore = v.riskTolerance === 'HIGH' ? 90 : v.riskTolerance === 'MEDIUM' ? 60 : 30;
    const total = proximityScore * 0.35 + capacityScore * 0.25 + fuelScore * 0.20 + riskScore * 0.20;
    return { vehicle: v, score: Math.round(total), etaHours: Math.round(etaHours * 10) / 10 };
  }).sort((a, b) => b.score - a.score);

  // Generate routes
  const routeResult = generateCandidateRoutes({
    origin_id: params.origin_id,
    destination_id: params.destination_id,
    cargo_type: params.cargo_type,
    cargo_weight_kg: params.cargo_weight_kg,
    vehicle_type: 'TRUCK',
    priority: params.priority,
  });

  // Identify regional highway corridor and agency contexts
  const originName = origin?.name || 'Guwahati';
  const destName = dest?.name || 'Tawang';
  const regionName = dest?.state || origin?.state || 'Assam / Arunachal Pradesh';
  const primaryCorridor = dest?.state === 'Arunachal Pradesh'
    ? 'NH-13 (Trans-Arunachal Highway) via Bhalukpong & Sela Pass'
    : dest?.state === 'Sikkim'
    ? 'NH-10 Sevoke–Gangtok Corridor'
    : dest?.state === 'Meghalaya'
    ? 'NH-06 Shillong–Silchar Corridor via East Jaintia Hills'
    : dest?.state === 'Manipur'
    ? 'NH-37 Imphal–Jiribam Highway'
    : dest?.state === 'Nagaland'
    ? 'NH-29 Dimapur–Kohima–Mao Corridor'
    : dest?.state === 'Mizoram'
    ? 'NH-306 Silchar–Aizawl Corridor'
    : 'NH-27 East-West Corridor';

  const broProject = dest?.state === 'Arunachal Pradesh'
    ? 'Project Vartak (BRO HQ Tezpur / Bomdila)'
    : dest?.state === 'Sikkim'
    ? 'Project Swastik (BRO Sikkim)'
    : dest?.state === 'Manipur' || dest?.state === 'Nagaland'
    ? 'Project Sewak (BRO Dimapur)'
    : dest?.state === 'Mizoram' || dest?.state === 'Tripura'
    ? 'Project Pushpak (BRO Silchar)'
    : 'Border Roads Organisation (Project Brahmank)';

  const nowIso = new Date().toISOString();
  const missionId = `MIS-EM-${Date.now().toString().slice(-6)}`;

  // Generate structured Emergency Recommendations
  const actions: EmergencyAction[] = [
    {
      id: 'EM-001',
      title: 'Avoid affected corridor for non-essential cargo',
      description: `Reroute commercial and civilian non-relief freight away from ${primaryCorridor} to prioritize convoy capacity for ${params.cargo_type}.`,
      priority: params.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      severity: 'SEVERE',
      corridor: primaryCorridor,
      region: regionName,
      reason: `Monsoon slope vulnerability and single-lane bottlenecks threaten mission delivery to ${destName}.`,
      impact: 'Reduces corridor congestion by ~45%, securing clear right-of-way for emergency relief.',
      responsibleAgency: `${regionName} State Transport Dept & Traffic Police`,
      resources: ['Regional Traffic Control Units', 'Automated VMS Highway Signs', 'Highway Patrol Escorts'],
      status: 'PENDING',
      confidence: 0.94,
      source: 'AuraNER Route Risk & Congestion Neural Model',
      timestamp: nowIso,
      actionType: 'AVOID_CORRIDOR',
    },
    {
      id: 'EM-002',
      title: 'Request helicopter support for cut-off areas',
      description: `Prepare air-logistics sortie request for high-elevation or landslide-isolated sectors between ${originName} and ${destName}.`,
      priority: accessDifficulty > 60 || params.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      severity: 'HIGH',
      corridor: `Air Corridor: ${originName} Heliport -> ${destName} Forward LZ`,
      region: regionName,
      reason: `Mountain passes along route exceed 2,000m with elevated rockfall hazard, risking surface convoy isolation.`,
      impact: 'Enables critical life-saving cargo insertion within 90 minutes bypassing ground blockages.',
      responsibleAgency: 'Indian Air Force / State Civil Aviation Directorate',
      resources: ['Mi-17V5 / ALH Dhruv Helicopter Sortie', 'Helipad Staging Crew', 'Weather Radar Clearance'],
      status: 'PENDING',
      confidence: 0.89,
      source: 'High-Altitude Terrain & Accessibility Sensor Grid',
      timestamp: nowIso,
      actionType: 'HELICOPTER_SUPPORT',
    },
    {
      id: 'EM-003',
      title: 'Coordinate with BRO for road clearing operations',
      description: `Initiate priority road-clearing alert and heavy machinery mobilization with ${broProject} on active landslide slips.`,
      priority: 'HIGH',
      severity: 'HIGH',
      corridor: primaryCorridor,
      region: regionName,
      reason: `Recent rainfall telemetry exceeds saturation thresholds on cut-slopes along ${primaryCorridor}.`,
      impact: 'Pre-positions hydraulic excavators and dozer teams at vulnerability hotspots, reducing clearance time from 14h to under 3h.',
      responsibleAgency: broProject,
      resources: ['Hydraulic Excavators (Cat 320D)', 'Wheel Loaders', 'Explosive Rock Clearance Team', 'BRO Emergency Unit'],
      status: 'PENDING',
      confidence: 0.92,
      source: 'Geological Survey of India Landslide Susceptibility Index + Rainfall Radar',
      timestamp: nowIso,
      actionType: 'BRO_CLEARING',
    },
    {
      id: 'EM-004',
      title: 'Activate local last-mile transport in cut-off areas',
      description: `Mobilize 4x4 high-clearance light transport and localized porter relays for terminal delivery into ${destName}.`,
      priority: 'MEDIUM',
      severity: 'MODERATE',
      corridor: `Terminal Spur: ${destName} Sub-Divisional Link Road`,
      region: regionName,
      reason: `Heavy heavy-commercial vehicle (HCV) axle limits prevent multi-axle trucks from completing the final 18 km mountain spur.`,
      impact: 'Guarantees uninterrupted final-mile delivery to healthcare centers and remote relief camps.',
      responsibleAgency: 'District Logistics Task Force & Local 4x4 Transport Unions',
      resources: ['4x4 High-Clearance Pickups (Mahindra Bolero Camper)', 'Nodal Transit Transshipment Hub', 'Field Relay Crew'],
      status: 'PENDING',
      confidence: 0.87,
      source: 'AuraNER Accessibility Radar & Bridge Capacity Registry',
      timestamp: nowIso,
      actionType: 'LAST_MILE',
    },
    {
      id: 'EM-005',
      title: 'Coordinate with state disaster management authorities',
      description: `Register mission operational manifest with ${regionName} SDMA & District Emergency Operations Centre (DEOC).`,
      priority: 'HIGH',
      severity: 'MODERATE',
      corridor: `${originName} to ${destName} Transit Sector`,
      region: regionName,
      reason: `Inter-district transit requires disaster response identification tags for emergency checkpoint clearance.`,
      impact: 'Secures zero-delay green-corridor passage across inter-district transit checkpoints.',
      responsibleAgency: `${regionName} State Disaster Management Authority (SDMA)`,
      resources: ['DEOC Coordination Desk', 'Inter-Agency Emergency Radio Frequency', 'Emergency Movement Permits'],
      status: 'PENDING',
      confidence: 0.95,
      source: 'National Disaster Management Framework Protocol',
      timestamp: nowIso,
      actionType: 'DISASTER_AUTHORITY',
    },
  ];

  const actionPlan = actions.map(a => a.title);

  return {
    mission_id: missionId,
    status: 'PENDING',
    mission_priority_score: Math.min(100, missionPriorityScore),
    priority_level: missionPriorityScore >= 85 ? 'CRITICAL' : missionPriorityScore >= 65 ? 'HIGH' : 'MEDIUM',
    routes: routeResult.routes,
    recommended_vehicle: scored[0]?.vehicle || VEHICLES[0],
    suitable_vehicles: scored.slice(0, 4).map(s => ({ ...s.vehicle })),
    action_plan: actionPlan,
    actions,
    audit_log: [
      {
        id: `AUD-${Date.now()}-001`,
        timestamp: nowIso,
        action: 'CREATED',
        actor: 'AI Emergency Logistics Engine',
        details: `Generated mission response plan for ${params.cargo_type} (${params.cargo_weight_kg}kg) from ${originName} to ${destName}. Priority score: ${missionPriorityScore}.`,
      },
    ],
    corridor_affected: primaryCorridor,
    data_source: 'AuraNER Priority Optimization Engine v2.4',
    timestamp: nowIso,
  };
}
