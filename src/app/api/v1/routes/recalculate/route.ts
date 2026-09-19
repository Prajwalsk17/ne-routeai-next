import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { routeRecalculateSchema } from '@/lib/validation';
import {
  recalculateSafeAlternative,
  RecalculationRequest,
} from '@/lib/services/recalculation.service';
import { getShipment } from '@/lib/services/dispatch.service';
import { findNearestSafeLocations } from '@/lib/services/safe-location.service';
import { getGeocodingProvider } from '@/lib/providers/geocoding.provider';
import { getServiceSupabase } from '@/lib/db/supabase';
import { VehicleProfile } from '@/lib/services/vehicle.service';
import { Coordinates } from '@/lib/providers/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');

    if (!shipmentId) {
      return apiError('Shipment ID is required', 'MISSING_PARAM', 400);
    }

    const supabase = getServiceSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return apiSuccess(data, { count: data.length });
      }
    }

    return apiSuccess([], { count: 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query recalculation history';
    return apiError(msg, 'RECALCULATION_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = routeRecalculateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { shipment_id, current_lat, current_lng, avoid_incident_id, reason } = parsed.data;
    const currentLocation: Coordinates = { lat: current_lat, lng: current_lng };

    // 1. Resolve Shipment details
    const shipment = await getShipment(shipment_id);

    // 2. Resolve Destination Coordinates
    let destinationLocation: Coordinates = { lat: 27.2647, lng: 92.4178 }; // Default: Bomdila, AP
    if (shipment?.destinationId) {
      const geocoding = getGeocodingProvider();
      const locations = await geocoding.search(shipment.destinationId);
      if (locations && locations.length > 0) {
        destinationLocation = { lat: locations[0].lat, lng: locations[0].lng };
      }
    }

    // 3. Resolve Vehicle Profile
    const vehicle: VehicleProfile = {
      id: shipment?.assignedVehicleId || 'v-active',
      registrationNumber: 'AS-01-AX-1010',
      type: 'UTILITY_4X4',
      capacityKg: 1500,
      volumeM3: 5.0,
      fuelType: 'DIESEL',
      terrainCapabilities: ['PLAIN', 'HILLY', 'MOUNTAINOUS', 'OFFROAD'],
      maxGradientPct: 35,
      maxWidthMeters: 2.0,
      waterCrossingCapable: true,
      fuelPct: 90,
      status: 'IN_TRANSIT',
      driver: shipment?.assignedDriverId || 'Driver Norbu',
    };

    // 4. Resolve Hazard Coordinates & Type
    let hazardCoordinates: Coordinates = {
      lat: parseFloat((current_lat + 0.05).toFixed(4)),
      lng: parseFloat((current_lng + 0.05).toFixed(4)),
    };
    let hazardType = 'ROAD_BLOCK';

    if (avoid_incident_id) {
      const supabase = getServiceSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('incidents')
            .select('*')
            .eq('id', avoid_incident_id)
            .single();

          if (!error && data) {
            hazardType = data.type || 'LANDSLIDE';
            if (typeof data.coordinates === 'string') {
              const match = data.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
              if (match) {
                hazardCoordinates = {
                  lng: parseFloat(match[1]),
                  lat: parseFloat(match[2]),
                };
              }
            }
          }
        } catch {
          // Keep default hazard location
        }
      }
    }

    // 5. Execute Alternative Route Recalculation
    const recalcRequest: RecalculationRequest = {
      shipmentId: shipment_id,
      currentLocation,
      destinationLocation,
      vehicle,
      hazardCoordinates,
      hazardType,
      currentRouteId: shipment?.activeRouteId || undefined,
      originalEtaMinutes: 180,
    };

    const recalculation = await recalculateSafeAlternative(recalcRequest);

    // 6. Discover Nearest Emergency Safe Havens
    const nearestSafeLocations = await findNearestSafeLocations(currentLocation, 3);

    return apiSuccess(
      {
        recalculation,
        nearestSafeLocations,
      },
      {
        message: `Route successfully recalculated around ${hazardType}. Detour assigned.`,
        reason,
      },
      200
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to recalculate route';
    return apiError(msg, 'ROUTE_RECALCULATION_ERROR', 500);
  }
}
