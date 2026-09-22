import { Coordinates } from '@/lib/providers/types';
import { getServiceSupabase } from '@/lib/db/supabase';

export interface SafeLocationProfile {
  id: string;
  name: string;
  type: 'POLICE_POST' | 'HOSPITAL' | 'RELIEF_CAMP' | 'FUEL_STATION' | 'WAREHOUSE';
  state: string;
  coordinates: Coordinates;
  contactNumber?: string;
  capacityDescription: string;
  distanceKm: number;
  estimatedTimeMinutes: number;
}

const REFERENCE_SAFE_LOCATIONS = [
  {
    id: 'safe-01',
    name: 'Guwahati Medical College Safe Staging',
    type: 'HOSPITAL' as const,
    state: 'Assam',
    coordinates: { lat: 26.1550, lng: 91.7712 },
    contactNumber: '+91-361-2130200',
    capacityDescription: 'Emergency trauma unit, heavy vehicle parking, fuel reserves',
  },
  {
    id: 'safe-02',
    name: 'Tezpur Police Post & Relief Depot',
    type: 'POLICE_POST' as const,
    state: 'Assam',
    coordinates: { lat: 26.6310, lng: 92.7950 },
    contactNumber: '+91-3712-220022',
    capacityDescription: 'Armed security, 20 vehicle secure bay, first aid station',
  },
  {
    id: 'safe-03',
    name: 'Dimapur Highway Security Station',
    type: 'POLICE_POST' as const,
    state: 'Nagaland',
    coordinates: { lat: 25.9120, lng: 93.7310 },
    contactNumber: '+91-3862-230100',
    capacityDescription: 'Highway patrol depot, vehicle recovery crane',
  },
  {
    id: 'safe-04',
    name: 'Shillong Civil Hospital Safe Zone',
    type: 'HOSPITAL' as const,
    state: 'Meghalaya',
    coordinates: { lat: 25.5750, lng: 91.8900 },
    contactNumber: '+91-364-2224100',
    capacityDescription: 'Highland medical depot, power backup, oxygen supplies',
  },
  {
    id: 'safe-05',
    name: 'Maram Military Checkpoint & Relief Camp',
    type: 'RELIEF_CAMP' as const,
    state: 'Manipur',
    coordinates: { lat: 25.1850, lng: 94.0150 },
    contactNumber: '+91-3871-222333',
    capacityDescription: 'Landslide recovery base, emergency communications, shelter',
  },
  {
    id: 'safe-06',
    name: 'Bomdila District Emergency Center',
    type: 'RELIEF_CAMP' as const,
    state: 'Arunachal Pradesh',
    coordinates: { lat: 27.2680, lng: 92.4200 },
    contactNumber: '+91-3782-222055',
    capacityDescription: 'Mountain rescue hub, satellite comms, diesel cache',
  },
];

/**
 * Discovers the nearest emergency safe locations relative to vehicle GPS coordinates.
 */
export async function findNearestSafeLocations(
  vehicleLocation: Coordinates,
  limit = 3
): Promise<SafeLocationProfile[]> {
  const supabase = getServiceSupabase();
  let candidateLocations = REFERENCE_SAFE_LOCATIONS;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('safe_locations').select('*');
      if (!error && data && data.length > 0) {
        candidateLocations = data.map((d) => {
          const match = typeof d.coordinates === 'string'
            ? d.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            : null;
          const lng = match ? parseFloat(match[1]) : NaN;
          const lat = match ? parseFloat(match[2]) : NaN;
          return {
            id: d.id,
            name: d.name,
            type: d.type,
            state: d.state,
            coordinates: { lng, lat },
            contactNumber: d.contact_number,
            capacityDescription: d.capacity_description,
          };
        });
      }
    } catch {
      // Use reference fallback
    }
  }

  // Calculate distances and sort
  const scored = candidateLocations.map((loc) => {
    const hasValidCoords =
      typeof loc.coordinates.lat === 'number' &&
      typeof loc.coordinates.lng === 'number' &&
      !isNaN(loc.coordinates.lat) &&
      !isNaN(loc.coordinates.lng);

    const distKm = hasValidCoords
      ? parseFloat(haversineDistanceKm(vehicleLocation, loc.coordinates).toFixed(1))
      : 99999;
    const estMinutes = hasValidCoords ? Math.round((distKm / 40) * 60) : 999;
    return {
      ...loc,
      distanceKm: distKm === 99999 ? NaN : distKm,
      estimatedTimeMinutes: distKm === 99999 ? NaN : Math.max(3, estMinutes),
    };
  });

  scored.sort((a, b) => {
    if (isNaN(a.distanceKm)) return 1;
    if (isNaN(b.distanceKm)) return -1;
    return a.distanceKm - b.distanceKm;
  });
  return scored.slice(0, limit);
}

function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
