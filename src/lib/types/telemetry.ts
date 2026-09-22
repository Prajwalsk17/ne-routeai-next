/**
 * AuraNER / NER-Route AI — Telemetry & GPS Tracking Domain Types
 * 
 * Defines data structures for live driver GPS capture, position ingestion,
 * temporal freshness tracking, vehicle connection states, and breadcrumbs.
 */

export type GpsFreshnessStatus = 'LIVE' | 'DEGRADED' | 'STALE' | 'OFFLINE';

export type GpsConnectionState =
  | 'STREAMING'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'PERMISSION_DENIED'
  | 'HARDWARE_UNAVAILABLE';

export interface GpsCoordinates {
  lat: number;
  lng: number;
}

export interface GpsPosition {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  organizationId: string;
  coordinates: GpsCoordinates;
  speedKmh: number;
  headingDegrees: number;
  altitudeMeters?: number | null;
  accuracyMeters?: number | null;
  batteryPct?: number | null;
  isOfflineCached?: boolean;
  recordedAt: string; // ISO 8601 UTC
  createdAt: string;  // ISO 8601 UTC
}

export interface GpsPositionInput {
  vehicle_id: string;
  trip_id?: string | null;
  shipment_id?: string | null;
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  heading_degrees?: number;
  altitude_meters?: number | null;
  accuracy_meters?: number | null;
  battery_pct?: number | null;
  recorded_at?: string;
  is_offline_cached?: boolean;
}

export interface GpsVehicleState {
  vehicleId: string;
  registrationNumber: string;
  makeModel?: string;
  vehicleType?: string;
  organizationId: string;
  driverId?: string | null;
  driverName?: string | null;
  tripId?: string | null;
  tripCode?: string | null;
  latestPosition: GpsPosition | null;
  freshness: GpsFreshnessStatus;
  staleDurationSeconds: number;
  lastHeartbeatAt?: string | null;
}

export interface GpsBatchIngestPayload {
  positions: GpsPositionInput[];
}

export interface GpsBatchIngestResult {
  ingestedCount: number;
  skippedCount: number;
  latestPosition: GpsPosition | null;
  errors?: string[];
}
