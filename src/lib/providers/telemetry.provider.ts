import { TelemetryProvider, TelemetryUpdate } from '@/lib/providers/types';
import { getServiceSupabase } from '@/lib/db/supabase';

// In-memory live position cache keyed by vehicleId
const latestPositions = new Map<string, TelemetryUpdate>();

export class DatabaseTelemetryProvider implements TelemetryProvider {
  async emitTelemetry(update: TelemetryUpdate): Promise<void> {
    // 1. Cache immediately in memory for real-time UI/monitoring reads
    latestPositions.set(update.vehicleId, update);

    // 2. Persist to Supabase if configured
    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        await supabase.from('telemetry').insert({
          vehicle_id: update.vehicleId,
          shipment_id: update.shipmentId,
          coordinates: `POINT(${update.coordinates.lng} ${update.coordinates.lat})`,
          speed_kmh: update.speedKmh,
          heading_degrees: update.headingDegrees,
          altitude_meters: update.altitudeMeters || null,
          accuracy_meters: update.accuracyMeters || null,
          recorded_at: update.timestamp,
        });

        // Update vehicle's current location point
        await supabase
          .from('vehicles')
          .update({
            current_location: `POINT(${update.coordinates.lng} ${update.coordinates.lat})`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.vehicleId);
      } catch (err) {
        console.error('Failed to persist telemetry to database:', err);
      }
    }
  }

  async getLatestTelemetry(vehicleId: string): Promise<TelemetryUpdate | null> {
    // Check in-memory cache first
    const cached = latestPositions.get(vehicleId);
    if (cached) return cached;

    // Fall back to database query
    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('telemetry')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          // Parse coordinates from PostGIS or WKT string
          const coordsMatch = typeof data.coordinates === 'string'
            ? data.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            : null;

          const lng = coordsMatch ? parseFloat(coordsMatch[1]) : 91.7362;
          const lat = coordsMatch ? parseFloat(coordsMatch[2]) : 26.1445;

          const result: TelemetryUpdate = {
            vehicleId: data.vehicle_id,
            shipmentId: data.shipment_id,
            coordinates: { lat, lng },
            speedKmh: Number(data.speed_kmh) || 0,
            headingDegrees: data.heading_degrees || 0,
            altitudeMeters: data.altitude_meters,
            accuracyMeters: data.accuracy_meters,
            timestamp: data.recorded_at,
          };

          latestPositions.set(vehicleId, result);
          return result;
        }
      } catch {
        // Fall back to default
      }
    }

    return null;
  }
}

let _telemetryProvider: TelemetryProvider | null = null;

export function getTelemetryProvider(): TelemetryProvider {
  if (!_telemetryProvider) {
    _telemetryProvider = new DatabaseTelemetryProvider();
  }
  return _telemetryProvider;
}

export function getAllCachedTelemetry(): TelemetryUpdate[] {
  return Array.from(latestPositions.values());
}

