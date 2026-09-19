// =============================================================================
// AuraNER / NER-RouteAI — Geocoding & Map Matching Adapter Contracts
// =============================================================================

import { Coordinates, GeocodingLocation } from '@/lib/providers/types';

export interface AddressValidationResult {
  isValid: boolean;
  standardizedAddress: string;
  postalCode?: string;
  state: string;
  district?: string;
  country: string;
  coordinates: Coordinates;
  confidenceScore: number; // 0.0 to 1.0
  validationFlags: string[];
}

export interface RawGpsPoint {
  lat: number;
  lng: number;
  timestampMs?: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDegrees?: number;
}

export interface SnappedCoordinate {
  originalLat: number;
  originalLng: number;
  snappedLat: number;
  snappedLng: number;
  distanceOffsetMeters: number;
  confidence: number;
  roadName?: string;
  speedLimitKmh?: number;
}

export interface MapMatchingResult {
  snappedPoints: SnappedCoordinate[];
  polylineCoordinates: [number, number][]; // [lng, lat]
  totalDistanceMeters: number;
  matchConfidence: number; // 0.0 to 1.0
  engine: string;
}

export interface IMapMatchingEngine {
  matchGpsTrace(
    trace: RawGpsPoint[],
    options?: {
      roadNetworkEdges?: Array<{
        id: string;
        name: string;
        coords: [number, number][];
      }>;
      vehicleProfile?: 'car' | 'truck' | 'heavy_truck';
    }
  ): Promise<MapMatchingResult>;
}

export interface IGeocodingAdapter {
  name: string;
  search(query: string, options?: { state?: string; limit?: number }): Promise<GeocodingLocation[]>;
  reverse(lat: number, lng: number): Promise<GeocodingLocation | null>;
  validateAddress(rawAddress: string): Promise<AddressValidationResult>;
}
