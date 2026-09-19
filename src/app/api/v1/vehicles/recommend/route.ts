import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { vehicleSelectionSchema } from '@/lib/validation';
import { getGeocodingProvider } from '@/lib/providers/geocoding.provider';
import { evaluateFleetForShipment } from '@/lib/services/vehicle.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = vehicleSelectionSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const {
      cargo_type,
      cargo_weight_kg,
      cargo_volume_m3,
      destination_id,
      priority,
      requires_cold_chain,
    } = parsed.data;

    // 1. Resolve Destination Location Profile
    const geocoding = getGeocodingProvider();
    const destMatches = await geocoding.search(destination_id, { limit: 1 });
    const destination = destMatches[0] || {
      id: destination_id,
      name: destination_id,
      state: 'Northeast Region',
      type: 'town',
      lat: 27.2647,
      lng: 92.4178,
      elevationMeters: 2415, // Default mountain profile
      accessibilityTier: 'LOW',
      roadAccessQuality: 'RESTRICTED',
    };

    // 2. Evaluate Fleet Suitability
    const recommendations = await evaluateFleetForShipment({
      cargoType: cargo_type,
      cargoWeightKg: cargo_weight_kg,
      cargoVolumeM3: cargo_volume_m3,
      destination,
      priority,
      requiresColdChain: requires_cold_chain,
    });

    const topRecommendation = recommendations.find((r) => r.isRecommended) || null;

    return apiSuccess({
      destination: {
        name: destination.name,
        state: destination.state,
        elevationMeters: destination.elevationMeters,
        roadAccessQuality: destination.roadAccessQuality,
      },
      cargo: {
        type: cargo_type,
        weightKg: cargo_weight_kg,
        volumeM3: cargo_volume_m3,
        requiresColdChain: requires_cold_chain,
      },
      topRecommendation,
      allCandidates: recommendations,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Vehicle recommendation failed';
    return apiError(msg, 'VEHICLE_EVALUATION_ERROR', 500);
  }
}
