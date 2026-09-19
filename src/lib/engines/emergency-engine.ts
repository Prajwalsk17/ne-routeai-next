// ============================================
// NER-RouteAI — Emergency Logistics Engine
// Mission priority scoring + vehicle selection
// ============================================

import type { EmergencyMissionParams, EmergencyResult, Vehicle } from '../types';
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

  const actionPlan = [
    `Dispatch ${scored[0]?.vehicle.id || 'nearest vehicle'} immediately from ${origin?.name || 'origin'}`,
    `Alert ${origin?.name || 'origin'} warehouse for rapid loading of ${params.cargo_type}`,
    `Notify ${dest?.name || 'destination'} facility of incoming emergency delivery`,
    'Monitor route risk continuously — activate rerouting if disruption detected',
    'Prepare backup vehicle as standby',
    missionPriorityScore > 80 ? 'Escalate to state disaster management authority' : 'Standard monitoring protocol',
  ];

  return {
    mission_priority_score: Math.min(100, missionPriorityScore),
    priority_level: missionPriorityScore >= 85 ? 'CRITICAL' : missionPriorityScore >= 65 ? 'HIGH' : 'MEDIUM',
    routes: routeResult.routes,
    recommended_vehicle: scored[0]?.vehicle || VEHICLES[0],
    suitable_vehicles: scored.slice(0, 4).map(s => ({ ...s.vehicle })),
    action_plan: actionPlan,
    data_source: 'AI_ENGINE',
  };
}
