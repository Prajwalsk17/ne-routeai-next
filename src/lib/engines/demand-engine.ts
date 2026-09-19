// ============================================
// NER-RouteAI — Demand Forecasting Engine
// ============================================

import type { DemandForecastParams, DemandForecastResult } from '../types';
import { LOCATIONS, DEMAND_DATA, ACCESSIBILITY_DATA } from '../seed-data';

const SEASON_MULTIPLIERS: Record<string, number> = {
  MONSOON: 1.4, PRE_MONSOON: 1.2, WINTER: 0.9, SUMMER: 1.0,
};

export function forecastDemand(params: DemandForecastParams): DemandForecastResult {
  const dd = DEMAND_DATA[params.location_id] || { medicine: 50, food: 50, water: 50, emergencyKits: 50, fuel: 50 };
  const loc = LOCATIONS.find(l => l.id === params.location_id);
  const access = ACCESSIBILITY_DATA[params.location_id];
  const seasonMult = SEASON_MULTIPLIERS[params.season] || 1.0;
  const accessPenalty = access ? Math.max(0, (70 - access.overall) / 100) : 0.1;
  const periodMult = Math.min(2, params.period_days / 30);

  const forecast = (base: number, volatility: number) => {
    const change = (seasonMult - 1) * 100 + base * volatility + accessPenalty * 20;
    return Math.round(Math.min(95, Math.max(-10, change * periodMult)));
  };

  const urgency = seasonMult > 1.2 || (access && access.overall < 40) ? 'HIGH' : 'MEDIUM';
  const locName = loc?.name || params.location_id;

  return {
    location_id: params.location_id,
    period_days: params.period_days,
    season: params.season,
    forecasts: {
      medicine: { current: dd.medicine, predicted_change_pct: forecast(dd.medicine, 0.3) },
      food: { current: dd.food, predicted_change_pct: forecast(dd.food, 0.2) },
      water: { current: dd.water, predicted_change_pct: forecast(dd.water, 0.4) },
      emergency_kits: { current: dd.emergencyKits, predicted_change_pct: forecast(dd.emergencyKits, 0.5) },
      fuel: { current: dd.fuel, predicted_change_pct: forecast(dd.fuel, 0.15) },
    },
    pre_positioning: {
      recommendation: urgency === 'HIGH'
        ? `URGENT: Move emergency supplies from nearest high-inventory hub to ${locName} before the predicted disruption window. Priority: medicine and water.`
        : `Standard pre-positioning recommended for ${locName}. Monitor seasonal demand patterns.`,
      urgency,
    },
    data_source: 'AI_ENGINE',
  };
}
