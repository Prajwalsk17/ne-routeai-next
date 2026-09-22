/**
 * AuraNER / NER-Route AI — Maps & Routing Provider Abstractions
 * 
 * Defines enterprise contracts for RoutingService and GeocodingService
 * as specified in Phase 1 Architecture Blueprint (Section 3.1 & 3.7).
 */

import { Coordinates } from '@/lib/providers/types';
import { TerrainType } from '@/lib/db/schema';

export type { Coordinates };

export type CacheStatus = 'LIVE' | 'CACHE_HIT' | 'STALE';

/**
 * Route Provenance metadata for traceability and compliance
 */
export interface RouteProvenance {
  providerName: string;
  providerVersion?: string;
  calculationTimestamp: string;
  latencyMs: number;
  cacheStatus: CacheStatus;
  routeHash: string;
  requestId?: string;
}

/**
 * Individual corridor segment of a route
 */
export interface RouteSegment {
  id?: string;
  segmentOrder: number;
  name: string;
  highwayCode?: string;
  geometry: [number, number][]; // [lng, lat] coordinate pairs
  distanceKm: number;
  durationMinutes: number;
  terrain: TerrainType;
  roadConditionScore: number; // 0 - 100
  bridgeWeightLimitTons?: number;
  maxWidthMeters?: number;
  elevationMeters?: number;
}

/**
 * Full result of a route calculation
 */
export interface RouteCalculationResult {
  geometry: [number, number][]; // LineString [lng, lat][]
  distanceKm: number;
  durationMinutes: number;
  elevationGainMeters: number;
  maxGradientPct: number;
  segments: RouteSegment[];
  provenance: RouteProvenance;
  warnings?: string[];
}

/**
 * Constraints applied to route calculation
 */
export interface RouteCalculationConstraints {
  waypoints?: Coordinates[];
  avoidCoordinates?: Coordinates[];
  avoidPolygons?: Array<[number, number][]>;
  maxGradientPct?: number;
  maxVehicleWidthMeters?: number;
  requires4x4?: boolean;
  vehicleType?: string;
  cargoWeightKg?: number;
  departureTime?: string;
}

/**
 * Distance and Time matrix between multiple origins and destinations
 */
export interface DistanceMatrixResult {
  origins: Coordinates[];
  destinations: Coordinates[];
  distancesKm: number[][];
  durationsMinutes: number[][];
  provenance: RouteProvenance;
}

/**
 * Geocoded location result
 */
export interface GeocodedLocation {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  state?: string;
  district?: string;
  type?: string;
  elevationMeters?: number;
  provenance: {
    providerName: string;
    timestamp: string;
  };
}

export interface GeocodeOptions {
  state?: string;
  limit?: number;
  country?: string;
}

/**
 * Primary Routing Service Contract
 */
export interface RoutingService {
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    constraints?: RouteCalculationConstraints
  ): Promise<RouteCalculationResult>;

  calculateMatrix(
    origins: Coordinates[],
    destinations: Coordinates[]
  ): Promise<DistanceMatrixResult>;
}

/**
 * Primary Geocoding Service Contract
 */
export interface GeocodingService {
  geocode(
    query: string,
    options?: GeocodeOptions
  ): Promise<GeocodedLocation[]>;

  reverseGeocode(
    coords: Coordinates
  ): Promise<GeocodedLocation | null>;
}

// =============================================================================
// Structured Routing & Geocoding Errors
// =============================================================================

export class RoutingError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'ROUTING_ERROR', statusCode = 500) {
    super(message);
    this.name = 'RoutingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ProviderUnavailableError extends RoutingError {
  constructor(providerName: string, reason?: string) {
    super(
      `Routing provider ${providerName} is currently unavailable${reason ? `: ${reason}` : ''}.`,
      'PROVIDER_UNAVAILABLE',
      503
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderTimeoutError extends RoutingError {
  constructor(providerName: string, timeoutMs: number) {
    super(
      `Routing provider ${providerName} timed out after ${timeoutMs}ms.`,
      'PROVIDER_TIMEOUT',
      504
    );
    this.name = 'ProviderTimeoutError';
  }
}

export class RouteNotFoundError extends RoutingError {
  constructor(origin: Coordinates, destination: Coordinates) {
    super(
      `No road route found between [${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}] and [${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}].`,
      'ROUTE_NOT_FOUND',
      404
    );
    this.name = 'RouteNotFoundError';
  }
}
