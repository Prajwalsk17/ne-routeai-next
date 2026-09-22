/**
 * AuraNER / NER-Route AI — Phase 16: Accessibility Engine Domain Types
 * 
 * Implements the accessibility intelligence architecture:
 * - Administrative isolation declarations (SDMA, BRO, PWD)
 * - Granular passability attributes & vehicle ingress suitability
 * - Route corridor & facility accessibility profiling
 * - Uncertainty tracking & temporal freshness evaluation
 * - Actionable accessibility warnings (bridge out, village isolated)
 * - Zero fabrication invariant: unobserved data reported as UNKNOWN
 */

import { Coordinates, RouteSegmentDetail } from '@/lib/providers/types';
import { EventFreshnessStatus, EventProvenance } from '@/lib/types/ingestion';

export type AccessibilityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED' | 'UNKNOWN';

export type RoadAccessQuality = 'ALL_WEATHER' | 'FAIR_WEATHER' | '4X4_ONLY' | 'RESTRICTED' | 'UNKNOWN';

export type VehicleAccessRequirement =
  | 'ALL_VEHICLES'
  | 'HIGH_CLEARANCE_ONLY'
  | 'FOUR_WHEEL_DRIVE_ONLY'
  | 'CONVOY_ONLY'
  | 'SMALL_VEHICLE_ONLY'
  | 'AIR_DROP_ONLY'
  | 'NO_ACCESS'
  | 'UNKNOWN';

export type AccessibilityWarningType =
  | 'VILLAGE_ISOLATED'
  | 'BRIDGE_OUT_WARNING'
  | 'CONVOY_ESCORT_REQUIRED'
  | 'SEASONAL_CUTOFF_IMMINENT'
  | 'RESTRICTED_ACCESS_PERMIT_REQUIRED'
  | 'NIGHT_TRAVEL_RESTRICTED'
  | 'STALE_INTELLIGENCE_WARNING';

export interface AccessibilityWarning {
  id: string;
  type: AccessibilityWarningType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  affectedSettlement?: string;
  affectedCorridor?: string;
  recommendedAction: string;
  isActionable: boolean;
}

/**
 * Official administrative declaration entity (`accessibility_events`)
 */
export interface AccessibilityDeclaration {
  id: string;
  declarationCode: string;
  settlementName: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  previousTier: AccessibilityTier;
  newTier: AccessibilityTier;
  reason: string;
  declaringAuthority: string; // e.g. "Assam State Disaster Management Authority (ASDMA)"
  effectiveFrom: string; // ISO-8601
  estimatedRestoration?: string | null;
  isActive: boolean;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  freshness: EventFreshnessStatus;
  createdAt: string;
  updatedAt: string;
  provenance: {
    sourceProvider: string;
    sourceCode: string;
    externalRecordId?: string;
    rawPayloadHash?: string;
    verifiedAt: string;
  };
}

/**
 * Physical terrain & infrastructure attributes for a settlement or corridor
 */
export interface AccessibilityAttributeSet {
  accessibilityTier: AccessibilityTier;
  roadAccessQuality: RoadAccessQuality;
  vehicleRequirement: VehicleAccessRequirement;
  maxGrossWeightTonnes?: number | null;
  maxVehicleHeightMeters?: number | null;
  bridgeStatus: 'STABLE' | 'RESTRICTED_LOAD' | 'TEMPORARY_BAILEYS' | 'IMPASSABLE' | 'UNKNOWN';
  seasonalMonsoonCutoffRisk: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE';
  nightTravelRestricted: boolean;
  permitRequired: boolean; // e.g. ILP / PAP
  telecomCoverageTier: 'HIGH_4G' | 'BASIC_2G' | 'SATELLITE_ONLY' | 'NO_SIGNAL' | 'UNKNOWN';
}

/**
 * Route corridor passability assessment profile
 */
export interface RouteAccessibilityProfile {
  overallTier: AccessibilityTier;
  requiredVehicleType: VehicleAccessRequirement;
  isFullyPassable: boolean;
  bottleneckSegment?: {
    segmentOrder: number;
    corridorName: string;
    reason: string;
    limitingTier: AccessibilityTier;
  } | null;
  evaluatedSegmentsCount: number;
  warnings: AccessibilityWarning[];
}

/**
 * Facility-level ingress & dock accessibility profile
 */
export interface FacilityAccessibilityProfile {
  facilityId: string;
  facilityName: string;
  accessibilityTier: AccessibilityTier;
  dockClearanceMeters: number;
  maxWeightCapacityTonnes: number;
  requiresFourWheelDrive: boolean;
  isOperational: boolean;
  staleDataWarning?: boolean;
}

/**
 * Complete assessment output from the Accessibility Engine
 */
export interface AccessibilityAssessmentResult {
  id: string;
  targetType: 'ROUTE' | 'FACILITY' | 'LOCATION';
  targetIdentifier: string;
  accessibilityTier: AccessibilityTier;
  vehicleRequirement: VehicleAccessRequirement;
  confidence: number; // 0.0 to 1.0
  confidenceRating: 'VERIFIED_HIGH' | 'PROBABLE' | 'UNCERTAIN' | 'UNKNOWN';
  freshness: EventFreshnessStatus | 'UNKNOWN';
  isStale: boolean;
  attributes: AccessibilityAttributeSet;
  routeProfile?: RouteAccessibilityProfile;
  facilityProfile?: FacilityAccessibilityProfile;
  warnings: AccessibilityWarning[];
  activeDeclarationsCount: number;
  explainability: {
    summary: string;
    limitingFactor: string;
    sourcesConsulted: string[];
    uncertaintyNote?: string;
  };
  provenance: {
    engineVersion: string;
    assessedAt: string;
    sources: string[];
    assessmentHash: string;
  };
}

export interface AccessibilityAssessInput {
  routeSegments?: RouteSegmentDetail[];
  location?: {
    id?: string;
    name?: string;
    coordinates: Coordinates;
    elevationMeters?: number;
    state?: string;
  };
  facilityId?: string;
  vehicleSpecs?: {
    is4WD?: boolean;
    grossWeightTonnes?: number;
    heightMeters?: number;
  };
  activeDeclarations?: AccessibilityDeclaration[];
}
