// =============================================================================
// AuraNER / NER-RouteAI — Commercial Routing & Fleet Optimization Contracts
// =============================================================================

import { Coordinates, RouteCalculationResult } from '@/lib/providers/types';

export type HazmatClass =
  | 'CLASS_1_EXPLOSIVES'
  | 'CLASS_2_GASES'
  | 'CLASS_3_FLAMMABLE_LIQUIDS'
  | 'CLASS_4_FLAMMABLE_SOLIDS'
  | 'CLASS_5_OXIDIZING_SUBSTANCES'
  | 'CLASS_6_TOXIC_SUBSTANCES'
  | 'CLASS_7_RADIOACTIVE'
  | 'CLASS_8_CORROSIVES'
  | 'CLASS_9_MISCELLANEOUS_HAZARDOUS';

export type TunnelRestrictionCode = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * 50+ Real-World Commercial Transport Parameters Specification
 */
export interface CommercialVehicleProfile {
  // Category 1: Physical Dimensions & Axle Weights (10 params)
  grossVehicleWeightKg: number;
  tareWeightKg: number;
  payloadCapacityKg: number;
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  groundClearanceMeters: number;
  turningRadiusMeters: number;
  axleCount: number;
  maxAxleWeightKg: number;

  // Category 2: Hazmat Transport Parameters (11 params)
  isCarryingHazmat: boolean;
  hazmatClasses: HazmatClass[];
  tunnelRestrictionCode: TunnelRestrictionCode;
  prohibitedNearWaterReserves: boolean;
  requiresHazmatPlacard: boolean;
  requiresEmergencyResponseGuide: boolean;
  requiresSecondaryContainment: boolean;
  hazmatNetExplosiveMassKg?: number;
  hazmatFlashpointCelsius?: number;
  emergencyContactPhone?: string;
  hazmatRouteAuthorized: boolean;

  // Category 3: Infrastructure & Structural Tolerances (7 params)
  maxBridgeLoadKgTolerance: number;
  minBridgeClearanceMetersTolerance: number;
  minOverheadCableClearanceMeters: number;
  tunnelMaxHeightClearanceMeters: number;
  minPavementClassificationNumber: number; // PCN
  ferryWeightLimitCapacityKg: number;
  requiresRailwayCrossingEscort: boolean;

  // Category 4: Terrain & Road Geometry Limits (8 params)
  maxTraversableGradientPct: number; // e.g. 15%
  minHairpinTurningRadiusMeters: number;
  allowUnpavedGravelRoads: boolean;
  hasMandatory4x4Awd: boolean;
  restrictedToSingleLaneConvoy: boolean;
  riverbedFordingDepthMaxMeters: number;
  hasSnowChainsEquipped: boolean;
  mountainNightTransitCertified: boolean;

  // Category 5: Regulatory, Curfews & Driver Operations (8 params)
  urbanEntryCurfewExemption: boolean;
  nationalParkSanctuaryTransitPermit: boolean;
  innerLinePermitVerified: boolean; // ILP for Arunachal/Nagaland/Mizoram
  eWayBillValid: boolean;
  maxContinuousDrivingHours: number; // HOS limit (e.g. 4.5 hrs)
  mandatoryRestStopMinutes: number; // e.g. 45 mins
  speedGovernorLimitKmh: number; // e.g. 60 km/h for heavy commercial
  emissionStandardTier: 'BS4' | 'BS6' | 'ELECTRIC' | 'HYBRID';

  // Category 6: Dynamic Traffic & Environmental Tolerances (6 params)
  liveTrafficDelayOffsetToleranceSec: number;
  maxWaterloggingDepthToleranceCm: number;
  denseFogConvoySpeedLimitKmh: number;
  maxCrosswindGustToleranceKmh: number;
  dynamicTurnRestrictionsStrict: boolean;
  electronicTollTagActive: boolean; // FASTag
}

export interface ConstraintViolation {
  code: string;
  category: 'PHYSICAL' | 'HAZMAT' | 'INFRASTRUCTURE' | 'TERRAIN' | 'REGULATORY' | 'ENVIRONMENTAL';
  severity: 'BLOCKING' | 'WARNING';
  parameterName: string;
  vehicleLimit: number | string | boolean;
  routeRequirement: number | string | boolean;
  message: string;
  location?: Coordinates;
}

export interface ConstraintEvaluationResult {
  isCompliant: boolean;
  hasBlockingViolations: boolean;
  penaltyFactor: number; // 1.0 = normal, >1.0 = speed/delay penalty
  adjustedDurationMinutes: number;
  violations: ConstraintViolation[];
  warnings: string[];
  compliantParametersCount: number;
  totalEvaluatedParametersCount: number;
}

export interface MatrixStop {
  id: string;
  name: string;
  coordinates: Coordinates;
  timeWindowStart?: string; // ISO or HH:MM
  timeWindowEnd?: string;
  serviceTimeMinutes?: number;
  demandWeightKg?: number;
  isPickup?: boolean;
}

export interface MatrixRequest {
  origins: MatrixStop[];
  destinations: MatrixStop[];
  vehicleProfile?: CommercialVehicleProfile;
  considerTraffic?: boolean;
}

export interface MatrixResponse {
  distanceMatrixKm: number[][]; // [originIdx][destIdx]
  durationMatrixMinutes: number[][];
  origins: MatrixStop[];
  destinations: MatrixStop[];
  engine: string;
}

export interface IRoutingAdapter {
  name: string;
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: {
      avoidCoordinates?: Coordinates[];
      vehicleProfile?: Partial<CommercialVehicleProfile>;
      departureTime?: string;
      waypoints?: Coordinates[];
    }
  ): Promise<RouteCalculationResult & { constraintEvaluation?: ConstraintEvaluationResult }>;

  calculateMatrix(request: MatrixRequest): Promise<MatrixResponse>;
}
