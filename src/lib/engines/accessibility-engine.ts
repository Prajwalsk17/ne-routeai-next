// ============================================
// NER-RouteAI — 6-Factor Accessibility Intelligence Engine
// ============================================

import type { AccessibilityResult, AccessibilityClassification } from '../types';
import { LOCATIONS, ACCESSIBILITY_DATA, DEMAND_DATA } from '../seed-data';

const WEIGHTS = { road: 0.25, transport: 0.15, healthcare: 0.20, emergency: 0.15, digital: 0.10, lastMile: 0.15 };

const FACTOR_LABELS: Record<string, string> = {
  road: 'Road Connectivity', transport: 'Transport Availability', healthcare: 'Healthcare Access',
  emergency: 'Emergency Access', digital: 'Digital Connectivity', lastMile: 'Last-Mile Connectivity',
};

function classify(score: number): AccessibilityClassification {
  if (score <= 30) return 'CRITICAL';
  if (score <= 50) return 'POOR';
  if (score <= 70) return 'MODERATE';
  if (score <= 85) return 'GOOD';
  return 'EXCELLENT';
}

export function getAccessibility(locationId: string): AccessibilityResult | null {
  const ad = ACCESSIBILITY_DATA[locationId];
  if (!ad) return null;
  const loc = LOCATIONS.find(l => l.id === locationId);

  const factors: [string, number][] = Object.entries(ad)
    .filter(([k]) => !['overall', 'classification'].includes(k))
    .map(([k, v]) => [k, v as number]);

  const bottleneck = factors.reduce((min, cur) => cur[1] < min[1] ? cur : min, factors[0]);

  // Gap analysis
  const dd = DEMAND_DATA[locationId];
  let gap_analysis;
  if (dd) {
    const demandScore = Math.round((dd.medicine + dd.food + dd.water + dd.emergencyKits + dd.fuel) / 5);
    const gapScore = Math.max(0, demandScore - ad.overall);
    gap_analysis = { demand_score: demandScore, accessibility_score: ad.overall, gap_score: gapScore };
  }

  // Generate recommendations based on bottleneck
  const recommendations: string[] = [];
  if (ad.lastMile < 40) recommendations.push('Deploy local last-mile transport (smaller vehicles, motorbikes)');
  if (ad.healthcare < 40) recommendations.push('Establish mobile health unit or temporary medical facility');
  if (ad.emergency < 40) recommendations.push('Pre-position emergency vehicle at nearest accessible point');
  if (ad.road < 40) recommendations.push('Prioritize road repair/improvement for this corridor');
  if (ad.digital < 40) recommendations.push('Install satellite communication for emergency coordination');
  if (ad.transport < 40) recommendations.push('Establish scheduled transport service to this location');
  if (recommendations.length === 0) recommendations.push('Maintain current infrastructure. Monitor for seasonal degradation.');

  return {
    location_id: locationId,
    location_name: loc?.name || locationId,
    scores: ad,
    overall: ad.overall,
    classification: ad.classification,
    bottleneck,
    gap_analysis,
    recommendations,
    data_source: 'AI_ENGINE',
  };
}

export function getAllAccessibility() {
  return Object.entries(ACCESSIBILITY_DATA)
    .map(([locId, ad]) => {
      const loc = LOCATIONS.find(l => l.id === locId);
      return { location_id: locId, name: loc?.name || locId, state: loc?.state || '', ...ad };
    })
    .sort((a, b) => a.overall - b.overall);
}

export function getLastMileIntelligence(locationId: string) {
  const ad = ACCESSIBILITY_DATA[locationId];
  const loc = LOCATIONS.find(l => l.id === locationId);
  if (!ad || !loc) return null;

  const terrainType = loc.elevation > 1200 ? 'Mountainous' : loc.elevation > 500 ? 'Hilly' : 'Plain';
  const vehicleSuitability = ad.road > 60 ? 'Standard trucks' : ad.road > 40 ? 'Medium (4WD recommended)' : 'Small vehicles / local transport only';

  return {
    location: loc.name,
    lastMileScore: ad.lastMile,
    roadCondition: ad.road < 40 ? 'Poor' : ad.road < 60 ? 'Fair' : 'Good',
    terrain: terrainType,
    elevation: loc.elevation,
    vehicleSuitability,
    connectivity: ad.digital < 40 ? 'Limited' : ad.digital < 60 ? 'Moderate' : 'Good',
    recommendation: ad.lastMile < 35
      ? `Use smaller/local transport for the final segment to ${loc.name}. Pre-stage supplies at nearest accessible hub.`
      : `Standard delivery vehicles can reach ${loc.name}. Monitor road conditions seasonally.`,
  };
}
