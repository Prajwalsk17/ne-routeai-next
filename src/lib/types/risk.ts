/**
 * AuraNER / NER-Route AI — Phase 15: Risk Engine Domain Types
 * 
 * Implements the core architecture:
 * - APIs provide facts (observed data)
 * - Algorithms calculate (mathematical scores & factor breakdown)
 * - AI reasons (semantic advisory context without factual hallucination)
 * - Backend enforces (policy gating & alert dispatching)
 * - Humans approve critical decisions (mandatory human confirmation for high-stakes reroutes)
 */

import { Coordinates, RouteSegmentDetail } from '@/lib/providers/types';
import { WeatherEvent, RoadEvent, AccessibilityEvent } from '@/lib/types/ingestion';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskEventStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED';

export type RiskEventCategory =
  | 'LANDSLIDE'
  | 'FLASH_FLOOD'
  | 'ROCKFALL'
  | 'ROAD_SUBSIDENCE'
  | 'BRIDGE_FAILURE'
  | 'SECURITY_CHECKPOINT'
  | 'CIVIL_UNREST'
  | 'SEVERE_WEATHER';

export type RiskFactorCategory =
  | 'INFRASTRUCTURE'
  | 'METEOROLOGICAL'
  | 'TOPOGRAPHICAL'
  | 'OPERATIONAL_TELEMETRY';

export type HazardActionRecommendation =
  | 'CONTINUE_WITH_CAUTION'
  | 'REDUCE_SPEED'
  | 'STOP_AT_SAFE_LOCATION'
  | 'RECALCULATE_ROUTE';

/**
 * Situational Hazard Entity (`risk_events` table)
 */
export interface RiskEvent {
  id: string;
  eventCode: string;
  category: RiskEventCategory;
  severity: RiskSeverity;
  status: RiskEventStatus;
  title: string;
  description: string;
  coordinates: Coordinates;
  affectedRadiusMeters: number;
  affectedCorridors: string[]; // e.g. ['NH-29', 'NH-6']
  state: string;
  confidence: number; // 0.0 to 1.0
  sourceId?: string | null;
  ingestionRunId?: string | null;
  reportedAt: string; // ISO-8601
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  provenance: {
    sourceProvider?: string;
    sourceCode?: string;
    externalRecordId?: string;
    rawPayloadHash?: string;
  };
}

export type RiskItemType =
  | 'Landslide'
  | 'Flood'
  | 'Heavy Rainfall'
  | 'Road Closure'
  | 'Earthquake'
  | 'Terrain'
  | 'Connectivity'
  | 'Accessibility'
  | 'Weather'
  | 'Infrastructure';

/**
 * Section 10 Canonical Risk Object Model
 */
export interface RiskItem {
  id: string;
  type: RiskItemType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number; // 0.0 to 1.0
  location: string;
  latitude: number;
  longitude: number;
  affectedArea: string;
  impact: string;
  source: string;
  timestamp: string; // ISO string
  expiresAt: string; // ISO string
  confidence: number; // 0.0 to 1.0
  description: string;
  recommendation: string;
  dataStatus: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
}

/**
 * Individual evaluated risk variable with clear distinction of facts and calculation
 */
export interface RiskFactor {
  id: string;
  name: string;
  category: RiskFactorCategory;
  /** Raw observed factual measurement */
  observedValue: {
    raw: unknown;
    unit?: string;
    description: string;
  };
  /** Normalized mathematical score in range [0.0, 1.0] */
  calculatedScore: number;
  /** Mathematical weight assigned in composite formula (weights sum to 1.0) */
  weight: number;
  /** Confidence rating of the observation source in range [0.0, 1.0] */
  confidence: number;
  /** Source provenance indicating origin of the factual data */
  provenance: string;
  /** Whether this individual factor exceeded a danger threshold */
  thresholdTriggered: boolean;
  /** Deterministic mathematical derivation explanation */
  calculationExplanation: string;
}

export interface HazardWarningItem {
  hazardId: string;
  category: string;
  severity: RiskSeverity;
  title: string;
  distanceFromVehicleKm: number;
  estimatedTimeToHazardMinutes: number;
  affectedCorridor?: string;
  isDirectBlockage: boolean;
  recommendedAction: HazardActionRecommendation;
  message: string;
}

export interface TelemetryObservedData {
  speedKmh?: number;
  speedVariance?: number;
  gpsMultipathJitterMeters?: number;
  deadReckoningDurationSeconds?: number;
  lastTelemetryTimestamp?: string;
}

export interface VehicleObservedSpecs {
  maxGradientPercent?: number;
  grossWeightTonnes?: number;
  waterFordingDepthMm?: number;
  hasColdChain?: boolean;
}

/**
 * Pure Observed Facts Container (APIs Provide Facts)
 * Completely isolated from calculated scores and AI reasoning
 */
export interface ObservedOperationalFacts {
  totalSegmentsEvaluated: number;
  corridors: string[];
  maxElevationMeters: number;
  maxGradientPercent: number;
  terrainBreakdown: Record<string, number>;
  activeRoadEventsCount: number;
  activeWeatherReadingsCount: number;
  activeRiskEventsCount: number;
  reportedPrecipitationMaxMm1h: number;
  reportedPrecipitationMaxMm24h: number;
  reportedWindSpeedMaxKmh: number;
  reportedMinVisibilityKm: number;
  roadBlockagesFound: string[];
  telemetryFacts?: TelemetryObservedData;
  vehicleFacts?: VehicleObservedSpecs;
  observationSources: string[];
}

/**
 * Semantic AI Interpretation (AI Reasons)
 * Generated based exclusively on observed facts and algorithmic calculations.
 * Invariant: AI never fabricates facts.
 */
export interface AiRiskInterpretation {
  summary: string;
  terrainContext: string;
  operationalImplication: string;
  suggestedAction: string;
  confidenceReasoning: string;
  timestamp: string;
}

/**
 * Input for Risk Calculation Engine
 */
export interface RiskCalculationInput {
  tripId?: string;
  shipmentId?: string;
  routeSegments: RouteSegmentDetail[];
  vehicleLocation?: Coordinates;
  weatherEvents?: WeatherEvent[];
  roadEvents?: RoadEvent[];
  accessibilityEvents?: AccessibilityEvent[];
  riskEvents?: RiskEvent[];
  telemetry?: TelemetryObservedData;
  vehicleSpecs?: VehicleObservedSpecs;
  options?: {
    customWeights?: {
      w1_infrastructure?: number;
      w2_meteorological?: number;
      w3_topographical?: number;
      w4_telemetry?: number;
    };
    includeAiReasoning?: boolean;
  };
}

/**
 * Complete Result from Risk Calculation Engine
 */
export interface RiskCalculationResult {
  id: string;
  /** Composite score normalized to [0.0, 1.0] */
  compositeScore: number;
  /** Scaled score [0, 100] for dashboard display */
  displayScore: number;
  severity: RiskSeverity;
  /** Composite confidence [0.0, 1.0] derived from weighted data sources */
  confidence: number;
  /** Factor-by-factor breakdown */
  factors: RiskFactor[];
  /** Sub-index scores [0.0, 1.0] */
  subIndices: {
    infrastructure: number;
    meteorological: number;
    topographical: number;
    telemetry: number;
  };
  /** Applied mathematical weights */
  weights: {
    infrastructure: number;
    meteorological: number;
    topographical: number;
    telemetry: number;
  };
  /** Active warnings ahead of vehicle or along route */
  hazardWarnings: HazardWarningItem[];
  /** Backend policy enforcement flag */
  requiresRecalculation: boolean;
  /** Core principle: Humans approve critical decisions */
  requiresHumanApproval: boolean;
  /** Pure observed facts (APIs provide facts) */
  observedData: ObservedOperationalFacts;
  /** Plain-language mathematical attribution */
  explainability: {
    formula: string;
    summary: string;
    primaryDriver: string;
    factorAttribution: Array<{ factor: string; contributionPercent: number; score: number }>;
  };
  /** Semantic AI reasoning (AI reasons) - strictly segregated */
  aiInterpretation?: AiRiskInterpretation;
  /** Cryptographic and temporal provenance */
  provenance: {
    engineVersion: string;
    calculatedAt: string;
    durationMs: number;
    sourcesConsulted: string[];
    calculationHash: string;
  };
}
