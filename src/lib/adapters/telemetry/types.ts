// =============================================================================
// AuraNER / NER-RouteAI — Real-Time Telemetry Pipeline Contracts
// =============================================================================

import { Coordinates } from '@/lib/providers/types';

export type TelemetryVehicleStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE_STALE';

export interface FilteredTelemetryRecord {
  vehicleId: string;
  shipmentId: string;
  rawCoordinates: Coordinates;
  filteredCoordinates: Coordinates;
  speedKmh: number;
  estimatedHeadingDegrees: number;
  accuracyMeters: number;
  isDeadReckoning: boolean;
  status: TelemetryVehicleStatus;
  dataAgeSeconds: number;
  timestamp: string;
}

export interface IngestTelemetryPayload {
  vehicleId: string;
  shipmentId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  headingDegrees?: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  timestampMs?: number;
}

export interface ITelemetryAdapter {
  name: string;
  ingestTelemetry(payload: IngestTelemetryPayload): Promise<FilteredTelemetryRecord>;
  checkStaleStatus(vehicleId: string): {
    isStale: boolean;
    status: TelemetryVehicleStatus;
    ageSeconds: number;
  };
  predictDeadReckoning(vehicleId: string, durationSeconds: number): FilteredTelemetryRecord | null;
  getLatestTelemetry(vehicleId: string): FilteredTelemetryRecord | null;
}
