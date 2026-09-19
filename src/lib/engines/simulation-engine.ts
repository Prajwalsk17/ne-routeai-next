// ============================================
// NER-RouteAI — What-If Disaster Simulation Engine
// ============================================

import type { SimulationParams, SimulationResult, ScenarioType } from '../types';
import { LOCATIONS, VEHICLES, ROAD_SEGMENTS, DELIVERIES } from '../seed-data';

const SCENARIO_IMPACTS: Record<ScenarioType, { routeMult: number; vehicleMult: number; delayBase: number; costMult: number }> = {
  HEAVY_RAINFALL:  { routeMult: 0.6, vehicleMult: 0.3, delayBase: 3, costMult: 0.4 },
  HIGHWAY_CLOSURE: { routeMult: 0.8, vehicleMult: 0.5, delayBase: 5, costMult: 0.6 },
  LANDSLIDE:       { routeMult: 0.7, vehicleMult: 0.4, delayBase: 6, costMult: 0.7 },
  FLOOD:           { routeMult: 0.9, vehicleMult: 0.6, delayBase: 8, costMult: 0.8 },
  BRIDGE_FAILURE:  { routeMult: 0.5, vehicleMult: 0.3, delayBase: 10, costMult: 0.9 },
  FUEL_SHORTAGE:   { routeMult: 0.3, vehicleMult: 0.7, delayBase: 4, costMult: 1.2 },
};

export function runSimulation(params: SimulationParams): SimulationResult {
  const impact = SCENARIO_IMPACTS[params.scenario_type];
  const sev = params.severity;

  const affectedRoutes = Math.round(ROAD_SEGMENTS.length * impact.routeMult * sev);
  const affectedDistricts = Math.round(2 + sev * 8);
  const vehiclesAffected = Math.round(VEHICLES.length * impact.vehicleMult * sev);
  const emergencyDeliveries = Math.round(DELIVERIES.filter(d => d.priority === 'CRITICAL' || d.priority === 'HIGH').length * sev + 2);
  const delayHours = Math.round((impact.delayBase * sev + params.duration_hours * 0.3) * 10) / 10;
  const accessImpact = Math.round(sev * 25);
  const costMult = Math.round((1 + impact.costMult * sev) * 100) / 100;

  const before = {
    avg_delivery_time: 6.8,
    avg_risk: 42,
    accessibility: 72,
    vehicle_availability: 85,
    completion_rate: 94,
  };

  const after = {
    avg_delivery_time: Math.round((before.avg_delivery_time + delayHours * 0.6) * 10) / 10,
    avg_risk: Math.min(100, Math.round(before.avg_risk + sev * 30)),
    accessibility: Math.max(20, Math.round(before.accessibility - accessImpact)),
    vehicle_availability: Math.max(15, Math.round(before.vehicle_availability - vehiclesAffected * 2)),
    completion_rate: Math.max(40, Math.round(before.completion_rate - sev * 18)),
  };

  const responsePlan = generateResponsePlan(params, affectedRoutes, vehiclesAffected, emergencyDeliveries);

  return {
    scenario: params.scenario_type,
    severity: sev,
    affected_routes: affectedRoutes,
    affected_districts: affectedDistricts,
    vehicles_affected: vehiclesAffected,
    emergency_deliveries: emergencyDeliveries,
    estimated_delay_hours: delayHours,
    accessibility_impact: accessImpact,
    logistics_cost_multiplier: costMult,
    before,
    after,
    response_plan: responsePlan,
    data_source: 'AI_ENGINE',
  };
}

function generateResponsePlan(params: SimulationParams, routes: number, vehicles: number, emergencies: number): string[] {
  const plan: string[] = [
    `Reroute ${Math.max(3, routes)} active vehicles via alternative corridors`,
    'Move emergency supplies to nearest operational hub',
    `Prioritize ${emergencies} critical medical deliveries`,
    'Avoid affected corridors for non-essential cargo',
  ];

  if (params.scenario_type === 'FLOOD' || params.scenario_type === 'HEAVY_RAINFALL') {
    plan.push('Deploy river boats for waterway-accessible locations');
    plan.push('Activate flood-stage emergency protocols');
  }
  if (params.scenario_type === 'LANDSLIDE' || params.scenario_type === 'BRIDGE_FAILURE') {
    plan.push('Request helicopter support for cut-off areas');
    plan.push('Coordinate with BRO for road clearing operations');
  }
  if (params.scenario_type === 'FUEL_SHORTAGE') {
    plan.push('Activate fuel reserves at forward bases');
    plan.push('Reduce non-essential vehicle movements by 50%');
  }

  plan.push('Activate local last-mile transport in cut-off areas');
  plan.push('Coordinate with state disaster management authorities');
  return plan;
}

export function simulateIncident(incidentType: string, routeId: string) {
  const segment = ROAD_SEGMENTS.find(r => r.id === routeId);
  const altSegments = ROAD_SEGMENTS.filter(r => r.id !== routeId && r.status === 'OPEN');
  const bypass = altSegments[0];

  return {
    incident_type: incidentType,
    blocked_route: segment ? { id: segment.id, name: segment.name } : null,
    status: 'ROUTE_BLOCKED',
    alternative_route: bypass ? {
      id: bypass.id,
      name: bypass.name,
      additional_distance_km: Math.round(bypass.distanceKm * 0.3),
      additional_time_hr: Math.round(bypass.baseTimeHr * 0.2 * 10) / 10,
      risk: bypass.riskScore < 40 ? 'LOW' : 'MODERATE',
    } : null,
    previous_eta: '5h 12m',
    new_eta: '5h 48m',
    message: `${incidentType} detected on ${segment?.name || 'route'}. Vehicle automatically rerouted via ${bypass?.name || 'alternative corridor'}.`,
    data_source: 'AI_ENGINE',
  };
}
