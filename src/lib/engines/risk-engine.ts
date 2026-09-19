// ============================================
// NER-RouteAI — Predictive Risk Intelligence Engine
// Landslide/Flood/Road disruption scoring with seasonal modifiers
// ============================================

import type { RiskPrediction, RiskRegion } from '../types';
import { LOCATIONS, RISK_DATA } from '../seed-data';

// Seasonal risk multipliers per state (monsoon-adjusted)
const STATE_MULTIPLIERS: Record<string, number> = {
  'Meghalaya': 1.35,      // World's wettest region
  'Arunachal Pradesh': 1.30,
  'Mizoram': 1.25,
  'Manipur': 1.20,
  'Assam': 1.15,
  'Nagaland': 1.15,
  'Sikkim': 1.20,
  'Tripura': 1.10,
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function predictRisk(locationId: string, horizonHours: number = 24): RiskPrediction {
  const rd = RISK_DATA[locationId] || {
    rainfall: 50, terrain: 50, historical: 50,
    roadCondition: 50, floodIndicator: 50, overall: 50, status: 'MODERATE' as const,
  };

  const loc = LOCATIONS.find(l => l.id === locationId);
  const stateMult = STATE_MULTIPLIERS[loc?.state || ''] || 1.0;

  // Horizon amplification: longer predictions = higher uncertainty = higher risk
  const horizonAmp = 1 + (horizonHours / 48) * 0.3;

  // Landslide probability: terrain + rainfall + historical
  const landslideProbRaw = (
    rd.terrain * 0.40 +
    rd.rainfall * 0.35 +
    rd.historical * 0.15 +
    rd.roadCondition * 0.10
  ) * stateMult * horizonAmp;

  // Flood probability: flood indicator + rainfall + historical
  const floodProbRaw = (
    rd.floodIndicator * 0.45 +
    rd.rainfall * 0.35 +
    rd.historical * 0.10 +
    rd.terrain * 0.10
  ) * stateMult * horizonAmp;

  // Road disruption: composite
  const roadDisruptionRaw = (
    rd.overall * 0.35 +
    rd.roadCondition * 0.25 +
    rd.rainfall * 0.20 +
    rd.floodIndicator * 0.10 +
    rd.historical * 0.10
  ) * stateMult * horizonAmp;

  const landslideProb = clamp(Math.round(landslideProbRaw), 0, 100);
  const floodProb = clamp(Math.round(floodProbRaw), 0, 100);
  const roadDisruption = clamp(Math.round(roadDisruptionRaw), 0, 100);

  // Overall risk composite
  const overallRisk = clamp(
    Math.round(landslideProb * 0.35 + floodProb * 0.30 + roadDisruption * 0.35),
    0, 100
  );

  const riskLevel =
    overallRisk >= 75 ? 'CRITICAL' :
    overallRisk >= 55 ? 'HIGH' :
    overallRisk >= 35 ? 'MODERATE' : 'LOW';

  return {
    location_id: locationId,
    current_status: rd.overall > 70 ? 'ELEVATED' : 'OPEN',
    landslide_probability: landslideProb,
    flood_probability: floodProb,
    road_disruption_probability: roadDisruption,
    overall_risk: overallRisk,
    risk_level: riskLevel,
    factors: rd,
    prediction_horizon_hours: horizonHours,
    data_source: 'AI_ENGINE',
  };
}

export function getAllRiskRegions(): RiskRegion[] {
  return Object.entries(RISK_DATA)
    .map(([locId, rd]) => {
      const loc = LOCATIONS.find(l => l.id === locId);
      return {
        location_id: locId,
        name: loc?.name || locId,
        state: loc?.state || '',
        overall_risk: rd.overall,
        status: rd.status,
      };
    })
    .sort((a, b) => b.overall_risk - a.overall_risk);
}

export function getRiskRecommendation(prediction: RiskPrediction): string {
  const loc = LOCATIONS.find(l => l.id === prediction.location_id);
  const name = loc?.name || prediction.location_id;

  if (prediction.overall_risk >= 75) {
    return `CRITICAL: Avoid dispatching non-critical cargo through ${name} corridor during the predicted high-risk window. Consider pre-positioning supplies at nearby hubs.`;
  }
  if (prediction.overall_risk >= 55) {
    return `HIGH RISK: Exercise caution on ${name} corridor. Recommend using high-clearance vehicles and monitoring conditions in real-time. Consider alternative routes.`;
  }
  if (prediction.overall_risk >= 35) {
    return `MODERATE: ${name} corridor is operational but elevated risk detected. Standard precautions apply. Monitor weather updates.`;
  }
  return `LOW RISK: ${name} corridor is safe for normal operations. Continue standard delivery schedules.`;
}
