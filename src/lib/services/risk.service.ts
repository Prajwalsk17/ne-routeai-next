import { Coordinates, RouteSegmentDetail, WeatherObservation } from '@/lib/providers/types';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActiveIncident {
  id: string;
  code: string;
  type: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  coordinates: Coordinates;
  affectedRadiusMeters: number;
  confidence: number;
  status: string;
  detectedAt: string;
}

export interface HazardWarning {
  incidentId: string;
  hazardType: string;
  severity: SeverityLevel;
  title: string;
  distanceFromVehicleKm: number;
  estimatedTimeToHazardMinutes: number;
  affectedSegmentOrder: number;
  isDirectBlockage: boolean;
  recommendedAction: 'CONTINUE_WITH_CAUTION' | 'REDUCE_SPEED' | 'STOP_AT_SAFE_LOCATION' | 'RECALCULATE_ROUTE';
  message: string;
}

export interface RouteRiskAssessment {
  compositeRiskScore: number; // 0 to 100
  overallSeverity: SeverityLevel;
  upcomingHazards: HazardWarning[];
  requiresRecalculation: boolean;
  weatherRiskScore: number;
  terrainRiskScore: number;
  incidentRiskScore: number;
  assessmentSummary: string;
}

/**
 * Evaluates route segments ahead of the vehicle for upcoming hazards and weather disruptions.
 */
export function assessRouteRisk(
  segments: RouteSegmentDetail[],
  vehicleLocation: Coordinates,
  incidents: ActiveIncident[],
  weatherObservations: WeatherObservation[] = []
): RouteRiskAssessment {
  const upcomingHazards: HazardWarning[] = [];
  let requiresRecalculation = false;

  // 1. Identify vehicle's current segment and segments ahead
  let closestSegmentIndex = 0;
  let minVehicleDist = Infinity;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const d = haversineDistanceKm(vehicleLocation, seg.startPoint);
    if (d < minVehicleDist) {
      minVehicleDist = d;
      closestSegmentIndex = i;
    }
  }

  // Active segments to monitor: current segment and all segments ahead
  const upcomingSegments = segments.slice(closestSegmentIndex);

  // 2. Scan upcoming segments against active incidents (Advancing Hazard Detection)
  let accumulatedDistanceKm = 0;

  for (const seg of upcomingSegments) {
    accumulatedDistanceKm += seg.distanceKm;

    for (const inc of incidents) {
      if (inc.status !== 'ACTIVE') continue;

      // False alert filtering: ignore low-confidence unconfirmed signals (< 0.40)
      if (inc.confidence < 0.40) continue;

      // Check distance from segment points to incident coordinate
      const distToStart = haversineDistanceKm(seg.startPoint, inc.coordinates);
      const distToEnd = haversineDistanceKm(seg.endPoint, inc.coordinates);
      const shortestDistKm = Math.min(distToStart, distToEnd);

      const radiusKm = inc.affectedRadiusMeters / 1000;
      const isImpactingSegment = shortestDistKm <= (radiusKm + 1.5); // Buffer

      if (isImpactingSegment) {
        const distFromVehicleKm = parseFloat(
          (haversineDistanceKm(vehicleLocation, inc.coordinates)).toFixed(1)
        );

        // Average mountain transit speed ~35 km/h
        const etaMinutes = Math.round((distFromVehicleKm / 35) * 60);
        const isBlockage =
          inc.type === 'LANDSLIDE' ||
          inc.type === 'BRIDGE_FAILURE' ||
          inc.type === 'ROAD_BLOCK' ||
          inc.severity === 'CRITICAL';

        if (isBlockage) {
          requiresRecalculation = true;
        }

        let recommendedAction: HazardWarning['recommendedAction'] = 'CONTINUE_WITH_CAUTION';
        if (distFromVehicleKm < 5.0 && isBlockage) {
          recommendedAction = 'STOP_AT_SAFE_LOCATION';
        } else if (isBlockage) {
          recommendedAction = 'RECALCULATE_ROUTE';
        } else if (inc.severity === 'HIGH') {
          recommendedAction = 'REDUCE_SPEED';
        }

        upcomingHazards.push({
          incidentId: inc.id,
          hazardType: inc.type,
          severity: inc.severity,
          title: inc.title,
          distanceFromVehicleKm: distFromVehicleKm,
          estimatedTimeToHazardMinutes: etaMinutes,
          affectedSegmentOrder: seg.segmentOrder,
          isDirectBlockage: isBlockage,
          recommendedAction,
          message: `${inc.type.replace(/_/g, ' ')} detected ${distFromVehicleKm} km ahead on Sector ${seg.segmentOrder}. ${inc.description}`,
        });
      }
    }
  }

  // 3. Compute Weather Risk Component
  let weatherRisk = 15;
  for (const obs of weatherObservations) {
    if (obs.rainfallMm1h > 20 || obs.isSevereWarning) {
      weatherRisk = Math.max(weatherRisk, 85);
      upcomingHazards.push({
        incidentId: `weather-${obs.lat}-${obs.lng}`,
        hazardType: 'HEAVY_RAIN',
        severity: 'HIGH',
        title: 'Severe Rainfall Corridor',
        distanceFromVehicleKm: parseFloat(haversineDistanceKm(vehicleLocation, obs).toFixed(1)),
        estimatedTimeToHazardMinutes: 15,
        affectedSegmentOrder: closestSegmentIndex + 1,
        isDirectBlockage: false,
        recommendedAction: 'REDUCE_SPEED',
        message: `Heavy precipitation (${obs.rainfallMm1h} mm/hr) detected ahead. High hydroplaning and rockfall risk.`,
      });
    } else if (obs.rainfallMm1h > 8) {
      weatherRisk = Math.max(weatherRisk, 50);
    }
  }

  // 4. Compute Terrain & Landslide Susceptibility
  let terrainRisk = 20;
  const highAltSegments = segments.filter((s) => s.terrain === 'MOUNTAINOUS');
  if (highAltSegments.length > 0) {
    terrainRisk = 45 + (weatherRisk > 50 ? 30 : 10);
  }

  // 5. Composite Risk Score (Weighted deterministic synthesis)
  const incidentRisk = upcomingHazards.length > 0
    ? Math.max(...upcomingHazards.map((h) => (h.severity === 'CRITICAL' ? 95 : h.severity === 'HIGH' ? 70 : 40)))
    : 10;

  const compositeRiskScore = Math.min(
    100,
    Math.round(terrainRisk * 0.25 + weatherRisk * 0.35 + incidentRisk * 0.40)
  );

  let overallSeverity: SeverityLevel = 'LOW';
  if (compositeRiskScore >= 80 || requiresRecalculation) overallSeverity = 'CRITICAL';
  else if (compositeRiskScore >= 60) overallSeverity = 'HIGH';
  else if (compositeRiskScore >= 35) overallSeverity = 'MEDIUM';

  const summary = requiresRecalculation
    ? `CRITICAL HAZARD DETECTED: Route is blocked ahead (${upcomingHazards[0]?.hazardType.replace(/_/g, ' ')}). Immediate recalculation required.`
    : upcomingHazards.length > 0
    ? `Caution: ${upcomingHazards.length} upcoming hazard(s) monitored ahead.`
    : 'Active route safe under current operational conditions.';

  return {
    compositeRiskScore,
    overallSeverity,
    upcomingHazards,
    requiresRecalculation,
    weatherRiskScore: weatherRisk,
    terrainRiskScore: terrainRisk,
    incidentRiskScore: incidentRisk,
    assessmentSummary: summary,
  };
}

function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
