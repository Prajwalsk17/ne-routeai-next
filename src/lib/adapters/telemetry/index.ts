// =============================================================================
// AuraNER / NER-RouteAI — Enterprise Telemetry Pipeline Adapter
// Ingests raw GPS feeds, applies Extended Kalman Filtering (EKF),
// manages dead reckoning during outages, and enforces 60s stale thresholds.
// =============================================================================

import {
  FilteredTelemetryRecord,
  IngestTelemetryPayload,
  ITelemetryAdapter,
  TelemetryVehicleStatus,
} from '@/lib/adapters/telemetry/types';
import { ExtendedKalmanFilter } from '@/lib/telemetry/kalman';
import { getEnv } from '@/lib/env';
import { getServiceSupabase } from '@/lib/db/supabase';

interface VehicleTrackerEntry {
  kalmanFilter: ExtendedKalmanFilter;
  latestRecord: FilteredTelemetryRecord;
  lastUpdatedTimestampMs: number;
}

export class EnterpriseTelemetryAdapter implements ITelemetryAdapter {
  public readonly name: string;
  private readonly vehicles: Map<string, VehicleTrackerEntry> = new Map();

  constructor() {
    this.name = 'EnterpriseTelemetryPipeline';
  }

  public checkStaleStatus(vehicleId: string): {
    isStale: boolean;
    status: TelemetryVehicleStatus;
    ageSeconds: number;
  } {
    const env = getEnv();
    const staleThresholdSec = env.TELEMETRY_STALE_AFTER_SECONDS ?? 60;
    const entry = this.vehicles.get(vehicleId);

    if (!entry) {
      return {
        isStale: true,
        status: 'OFFLINE_STALE',
        ageSeconds: Infinity,
      };
    }

    const ageSeconds = Math.max(0, Math.floor((Date.now() - entry.lastUpdatedTimestampMs) / 1000));
    const isStale = ageSeconds > staleThresholdSec;

    return {
      isStale,
      status: isStale ? 'OFFLINE_STALE' : 'ONLINE',
      ageSeconds,
    };
  }

  public async ingestTelemetry(payload: IngestTelemetryPayload): Promise<FilteredTelemetryRecord> {
    const timestampMs = payload.timestampMs ?? Date.now();
    let entry = this.vehicles.get(payload.vehicleId);

    // Initialize EKF for this vehicle if not yet tracking
    if (!entry) {
      const kf = new ExtendedKalmanFilter(payload.latitude, payload.longitude, timestampMs, {
        processNoiseVariance: 0.08,
        defaultMeasurementNoise: payload.accuracyMeters ?? 6.0,
      });

      const initialRecord: FilteredTelemetryRecord = {
        vehicleId: payload.vehicleId,
        shipmentId: payload.shipmentId,
        rawCoordinates: { lat: payload.latitude, lng: payload.longitude },
        filteredCoordinates: { lat: payload.latitude, lng: payload.longitude },
        speedKmh: payload.speedKmh ?? 0,
        estimatedHeadingDegrees: payload.headingDegrees ?? 0,
        accuracyMeters: payload.accuracyMeters ?? 5.0,
        isDeadReckoning: false,
        status: 'ONLINE',
        dataAgeSeconds: 0,
        timestamp: new Date(timestampMs).toISOString(),
      };

      entry = {
        kalmanFilter: kf,
        latestRecord: initialRecord,
        lastUpdatedTimestampMs: timestampMs,
      };

      this.vehicles.set(payload.vehicleId, entry);
    } else {
      // Update existing Kalman filter with new raw GPS measurement
      const kfState = entry.kalmanFilter.update(
        payload.latitude,
        payload.longitude,
        timestampMs,
        payload.accuracyMeters
      );

      const record: FilteredTelemetryRecord = {
        vehicleId: payload.vehicleId,
        shipmentId: payload.shipmentId,
        rawCoordinates: { lat: payload.latitude, lng: payload.longitude },
        filteredCoordinates: { lat: kfState.lat, lng: kfState.lng },
        speedKmh: kfState.speedKmh > 0 ? kfState.speedKmh : (payload.speedKmh ?? 0),
        estimatedHeadingDegrees: kfState.headingDegrees,
        accuracyMeters: kfState.accuracyMeters,
        isDeadReckoning: false,
        status: 'ONLINE',
        dataAgeSeconds: 0,
        timestamp: new Date(timestampMs).toISOString(),
      };

      entry.latestRecord = record;
      entry.lastUpdatedTimestampMs = timestampMs;
    }

    // Broadcast update via Supabase Realtime channel if available
    this.broadcastRealtimeUpdate(entry.latestRecord);

    return entry.latestRecord;
  }

  public predictDeadReckoning(vehicleId: string, durationSeconds: number): FilteredTelemetryRecord | null {
    const entry = this.vehicles.get(vehicleId);
    if (!entry) return null;

    const projectedState = entry.kalmanFilter.predictDeadReckoning(durationSeconds);
    const staleInfo = this.checkStaleStatus(vehicleId);

    const deadReckoningRecord: FilteredTelemetryRecord = {
      vehicleId,
      shipmentId: entry.latestRecord.shipmentId,
      rawCoordinates: entry.latestRecord.rawCoordinates,
      filteredCoordinates: { lat: projectedState.lat, lng: projectedState.lng },
      speedKmh: projectedState.speedKmh,
      estimatedHeadingDegrees: projectedState.headingDegrees,
      accuracyMeters: projectedState.accuracyMeters,
      isDeadReckoning: true,
      status: staleInfo.isStale ? 'OFFLINE_STALE' : 'DEGRADED',
      dataAgeSeconds: staleInfo.ageSeconds + durationSeconds,
      timestamp: new Date(projectedState.timestampMs).toISOString(),
    };

    entry.latestRecord = deadReckoningRecord;
    return deadReckoningRecord;
  }

  public getLatestTelemetry(vehicleId: string): FilteredTelemetryRecord | null {
    const entry = this.vehicles.get(vehicleId);
    if (!entry) return null;

    // Check if vehicle has become stale
    const staleInfo = this.checkStaleStatus(vehicleId);
    if (staleInfo.isStale && entry.latestRecord.status !== 'OFFLINE_STALE') {
      entry.latestRecord = {
        ...entry.latestRecord,
        status: 'OFFLINE_STALE',
        dataAgeSeconds: staleInfo.ageSeconds,
      };
    } else {
      entry.latestRecord = {
        ...entry.latestRecord,
        dataAgeSeconds: staleInfo.ageSeconds,
      };
    }

    return entry.latestRecord;
  }

  private broadcastRealtimeUpdate(record: FilteredTelemetryRecord): void {
    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        // Send to Supabase Realtime broadcast channel
        supabase.channel(`fleet-telemetry:${record.vehicleId}`).send({
          type: 'broadcast',
          event: 'position_update',
          payload: record,
        });
      } catch {
        // Safe fallback in dev/mock
      }
    }
  }
}

let _telemetryAdapter: ITelemetryAdapter | null = null;

export function getTelemetryAdapter(): ITelemetryAdapter {
  if (!_telemetryAdapter) {
    _telemetryAdapter = new EnterpriseTelemetryAdapter();
  }
  return _telemetryAdapter;
}
