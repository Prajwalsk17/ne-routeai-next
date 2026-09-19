// ============================================
// NER-RouteAI — Multi-Criteria Route Scoring Engine
// Generates 3 candidate routes with weighted scoring
// ============================================

import type { RouteCandidate, RouteAnalyzeParams, RouteAnalysisResult, Priority } from '../types';
import { LOCATIONS, RISK_DATA, ACCESSIBILITY_DATA, ROAD_SEGMENTS } from '../seed-data';

// Priority-based weight configurations
const WEIGHT_PROFILES: Record<Priority, Record<string, number>> = {
  CRITICAL: { safety: 0.35, time: 0.30, disaster: 0.20, road: 0.10, cost: 0.05 },
  HIGH:     { safety: 0.30, time: 0.25, disaster: 0.15, road: 0.15, cost: 0.15 },
  MEDIUM:   { safety: 0.20, time: 0.30, disaster: 0.10, road: 0.20, cost: 0.20 },
  LOW:      { safety: 0.15, time: 0.25, disaster: 0.10, road: 0.20, cost: 0.30 },
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function formatTime(hours: number): string {
  const hr = Math.floor(hours);
  const mn = Math.round((hours - hr) * 60);
  return `${hr}h ${String(mn).padStart(2, '0')}m`;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreRoute(routeData: Partial<RouteCandidate>, priority: Priority): {
  score: number;
  breakdown: RouteCandidate['scoreBreakdown'];
  explanation: string;
  reliabilityPct: number;
} {
  const w = WEIGHT_PROFILES[priority];

  const weatherSafety = 100 - (routeData.weatherRisk ?? 50);
  const landslideSafety = 100 - (routeData.landslidRisk ?? 50);
  const floodSafety = 100 - (routeData.floodRisk ?? 50);
  const safetyScore = weatherSafety * 0.4 + landslideSafety * 0.4 + floodSafety * 0.2;

  const disasterScore = 100 - (routeData.riskScore ?? 50);
  const timeHr = routeData.travelTimeHr ?? 8;
  const timeScore = 100 - normalize(timeHr, 2, 12);
  const cost = routeData.costInr ?? 15000;
  const costScore = 100 - normalize(cost, 5000, 30000);
  const roadScore = routeData.roadCondition ?? 60;

  const finalScore = Math.round(
    w.safety * safetyScore +
    w.time * timeScore +
    w.disaster * disasterScore +
    w.road * roadScore +
    w.cost * costScore
  );

  const reliabilityPct = Math.round(
    Math.min(100, roadScore * 0.4 + disasterScore * 0.35 + weatherSafety * 0.25)
  );

  const breakdown = {
    roadCondition: roadScore,
    weatherSafety: Math.round(weatherSafety),
    landslideSafety: Math.round(landslideSafety),
    floodSafety: Math.round(floodSafety),
    travelTimeScore: Math.round(timeScore),
    costEfficiency: Math.round(costScore),
    accessibility: routeData.accessibility ?? 60,
  };

  const explanation =
    `Route ${routeData.rankLabel} scored ${Math.min(100, Math.max(10, finalScore))}/100 using a ${priority}-priority weighted model. ` +
    `Key strengths: road condition (${roadScore}/100), landslide safety (${Math.round(landslideSafety)}/100). ` +
    `Overall risk: ${routeData.riskScore! < 30 ? 'LOW' : routeData.riskScore! < 55 ? 'MODERATE' : routeData.riskScore! < 75 ? 'HIGH' : 'CRITICAL'}. ` +
    `Reliability: ${reliabilityPct}% — model's estimated probability that this route remains operational during the journey window.`;

  return { score: Math.min(100, Math.max(10, finalScore)), breakdown, explanation, reliabilityPct };
}

export function generateCandidateRoutes(params: RouteAnalyzeParams): RouteAnalysisResult {
  const origin = LOCATIONS.find(l => l.id === params.origin_id);
  const dest = LOCATIONS.find(l => l.id === params.destination_id);

  if (!origin || !dest) {
    return { routes: [], analysis_id: `ANA-${Date.now()}`, recommended_route: '' };
  }

  const baseDist = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  const originRisk = RISK_DATA[params.origin_id] || { overall: 40 };
  const destRisk = RISK_DATA[params.destination_id] || { overall: 60 };
  const avgRisk = (originRisk.overall + destRisk.overall) / 2;
  const destAccess = ACCESSIBILITY_DATA[params.destination_id] || { overall: 55 };
  const isCritical = params.priority === 'CRITICAL' || params.priority === 'HIGH';

  // Find relevant road segments for route descriptions
  const relevantSegments = ROAD_SEGMENTS.filter(
    s => s.fromLoc === params.origin_id || s.toLoc === params.destination_id ||
         s.toLoc === params.origin_id || s.fromLoc === params.destination_id
  );

  // Generate 3 route variants
  const rawRoutes: Partial<RouteCandidate>[] = [
    {
      id: 'ROUTE_A', rankLabel: 'A', name: 'Route A — Safest',
      distanceKm: Math.round(baseDist * 1.25),
      travelTimeHr: (baseDist * 1.25) / 45 + dest.elevation / 2000,
      roadCondition: 88, riskScore: Math.max(12, avgRisk - 18),
      weatherRisk: avgRisk * 0.55, landslidRisk: avgRisk * 0.45, floodRisk: avgRisk * 0.35,
      accessibility: Math.min(95, (destAccess.overall || 55) + 15),
      costInr: Math.round((baseDist * 1.25 * 33) / 100) * 100,
      via: [`${origin.state} NH`, 'National Corridor', `${dest.state} Entry`],
      color: '#22C55E',
    },
    {
      id: 'ROUTE_B', rankLabel: 'B', name: 'Route B — Balanced',
      distanceKm: Math.round(baseDist * 1.10),
      travelTimeHr: (baseDist * 1.10) / 50 + dest.elevation / 2500,
      roadCondition: 65, riskScore: avgRisk,
      weatherRisk: avgRisk * 0.78, landslidRisk: avgRisk * 0.65, floodRisk: avgRisk * 0.55,
      accessibility: destAccess.overall || 55,
      costInr: Math.round((baseDist * 1.10 * 30) / 100) * 100,
      via: [`${origin.state} Bypass`, 'State Highway', `${dest.state} Main Road`],
      color: '#F59E0B',
    },
    {
      id: 'ROUTE_C', rankLabel: 'C', name: 'Route C — Fastest',
      distanceKm: Math.round(baseDist * 0.98),
      travelTimeHr: (baseDist * 0.98) / 55 + dest.elevation / 3000,
      roadCondition: 42, riskScore: Math.min(88, avgRisk + 22),
      weatherRisk: avgRisk * 1.05, landslidRisk: avgRisk * 0.85, floodRisk: avgRisk * 0.75,
      accessibility: Math.max(20, (destAccess.overall || 55) - 15),
      costInr: Math.round((baseDist * 0.98 * 28) / 100) * 100,
      via: [`Direct ${origin.state}–${dest.state}`, 'Mountain Pass'],
      color: '#EF4444',
    },
  ];

  // Score and finalize each route
  const routes: RouteCandidate[] = rawRoutes.map(r => {
    const { score, breakdown, explanation, reliabilityPct } = scoreRoute(r, params.priority);
    const riskLabel = r.riskScore! < 30 ? 'LOW' : r.riskScore! < 55 ? 'MODERATE' : r.riskScore! < 75 ? 'HIGH' : 'CRITICAL';

    const warnings: string[] = [];
    if (r.landslidRisk! > 60) warnings.push('High landslide probability on this corridor');
    if (r.floodRisk! > 50) warnings.push('Flood risk detected on route segments');
    if (r.roadCondition! < 45) warnings.push('Poor road condition — reduce vehicle speed');
    if (dest.elevation > 1200) warnings.push('High altitude destination — plan for terrain delays');

    return {
      ...r,
      travelTimeDisplay: formatTime(r.travelTimeHr!),
      score,
      reliabilityPct,
      riskLabel,
      warnings,
      scoreBreakdown: breakdown,
      explanation,
    } as RouteCandidate;
  });

  routes.sort((a, b) => b.score - a.score);

  return {
    routes,
    analysis_id: `ANA-${Date.now()}`,
    recommended_route: routes[0]?.id || '',
  };
}
