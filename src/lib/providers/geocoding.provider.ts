import { GeocodingLocation, GeocodingProvider } from '@/lib/providers/types';
import { getEnv } from '@/lib/env';

// Verified reference points across all 8 Northeast states for instant local & offline search
const NER_REFERENCE_LOCATIONS: GeocodingLocation[] = [
  // Assam
  { id: 'loc-gau', name: 'Guwahati', state: 'Assam', district: 'Kamrup Metropolitan', type: 'city', lat: 26.1445, lng: 91.7362, elevationMeters: 55, population: 957352, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-tez', name: 'Tezpur', state: 'Assam', district: 'Sonitpur', type: 'town', lat: 26.6338, lng: 92.8004, elevationMeters: 79, population: 58851, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-sil', name: 'Silchar', state: 'Assam', district: 'Cachar', type: 'city', lat: 24.8333, lng: 92.7789, elevationMeters: 20, population: 228985, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-jor', name: 'Jorhat', state: 'Assam', district: 'Jorhat', type: 'city', lat: 26.7509, lng: 94.2037, elevationMeters: 116, population: 153889, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-dib', name: 'Dibrugarh', state: 'Assam', district: 'Dibrugarh', type: 'city', lat: 27.4728, lng: 94.9120, elevationMeters: 108, population: 154296, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },

  // Arunachal Pradesh
  { id: 'loc-ita', name: 'Itanagar', state: 'Arunachal Pradesh', district: 'Papum Pare', type: 'city', lat: 27.0844, lng: 93.6053, elevationMeters: 360, population: 44971, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-bom', name: 'Bomdila', state: 'Arunachal Pradesh', district: 'West Kameng', type: 'town', lat: 27.2647, lng: 92.4178, elevationMeters: 2415, population: 8500, accessibilityTier: 'LOW', roadAccessQuality: 'RESTRICTED' },
  { id: 'loc-taw', name: 'Tawang', state: 'Arunachal Pradesh', district: 'Tawang', type: 'town', lat: 27.5833, lng: 91.8667, elevationMeters: 3048, population: 11200, accessibilityTier: 'ISOLATED', roadAccessQuality: 'RESTRICTED' },
  { id: 'loc-pas', name: 'Pasighat', state: 'Arunachal Pradesh', district: 'East Siang', type: 'town', lat: 28.0670, lng: 95.3335, elevationMeters: 153, population: 22161, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-zir', name: 'Ziro', state: 'Arunachal Pradesh', district: 'Lower Subansiri', type: 'town', lat: 27.5500, lng: 93.8333, elevationMeters: 1554, population: 8000, accessibilityTier: 'LOW', roadAccessQuality: 'FAIR_WEATHER' },

  // Manipur
  { id: 'loc-imp', name: 'Imphal', state: 'Manipur', district: 'Imphal West', type: 'city', lat: 24.8170, lng: 93.9368, elevationMeters: 786, population: 414288, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-chu', name: 'Churachandpur', state: 'Manipur', district: 'Churachandpur', type: 'town', lat: 24.3333, lng: 93.6833, elevationMeters: 920, population: 56630, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-sen', name: 'Senapati', state: 'Manipur', district: 'Senapati', type: 'town', lat: 25.2667, lng: 93.9667, elevationMeters: 1450, population: 42800, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-kar', name: 'Karong', state: 'Manipur', district: 'Senapati', type: 'village', lat: 25.1500, lng: 94.1000, elevationMeters: 1680, population: 3200, accessibilityTier: 'ISOLATED', roadAccessQuality: '4X4_ONLY' },

  // Meghalaya
  { id: 'loc-shi', name: 'Shillong', state: 'Meghalaya', district: 'East Khasi Hills', type: 'city', lat: 25.5788, lng: 91.8933, elevationMeters: 1496, population: 354759, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-tur', name: 'Tura', state: 'Meghalaya', district: 'West Garo Hills', type: 'town', lat: 25.5167, lng: 90.2167, elevationMeters: 325, population: 72104, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-che', name: 'Cherrapunji', state: 'Meghalaya', district: 'East Khasi Hills', type: 'town', lat: 25.2833, lng: 91.7333, elevationMeters: 1484, population: 11722, accessibilityTier: 'LOW', roadAccessQuality: 'ALL_WEATHER' },

  // Mizoram
  { id: 'loc-aiz', name: 'Aizawl', state: 'Mizoram', district: 'Aizawl', type: 'city', lat: 23.7307, lng: 92.7173, elevationMeters: 1132, population: 293416, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-lun', name: 'Lunglei', state: 'Mizoram', district: 'Lunglei', type: 'town', lat: 22.8833, lng: 92.7333, elevationMeters: 1133, population: 58986, accessibilityTier: 'LOW', roadAccessQuality: 'FAIR_WEATHER' },

  // Nagaland
  { id: 'loc-koh', name: 'Kohima', state: 'Nagaland', district: 'Kohima', type: 'city', lat: 25.6701, lng: 94.1077, elevationMeters: 1444, population: 267988, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-dim', name: 'Dimapur', state: 'Nagaland', district: 'Dimapur', type: 'city', lat: 25.9069, lng: 93.7258, elevationMeters: 232, population: 422032, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-mok', name: 'Mokokchung', state: 'Nagaland', district: 'Mokokchung', type: 'town', lat: 26.3208, lng: 94.5198, elevationMeters: 1325, population: 38474, accessibilityTier: 'MEDIUM', roadAccessQuality: 'ALL_WEATHER' },

  // Tripura
  { id: 'loc-aga', name: 'Agartala', state: 'Tripura', district: 'West Tripura', type: 'city', lat: 23.8315, lng: 91.2868, elevationMeters: 13, population: 400004, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },

  // Sikkim
  { id: 'loc-gan', name: 'Gangtok', state: 'Sikkim', district: 'East Sikkim', type: 'city', lat: 27.3389, lng: 88.6065, elevationMeters: 1650, population: 100286, accessibilityTier: 'HIGH', roadAccessQuality: 'ALL_WEATHER' },
  { id: 'loc-man', name: 'Mangan', state: 'Sikkim', district: 'North Sikkim', type: 'town', lat: 27.5000, lng: 88.5333, elevationMeters: 956, population: 4644, accessibilityTier: 'LOW', roadAccessQuality: 'RESTRICTED' },
];

export class DefaultGeocodingProvider implements GeocodingProvider {
  async search(query: string, options?: { state?: string; limit?: number }): Promise<GeocodingLocation[]> {
    const q = query.trim().toLowerCase();
    const limit = options?.limit || 10;

    // 1. First search local NER reference index
    const localMatches = NER_REFERENCE_LOCATIONS.filter((loc) => {
      const nameMatch = loc.name.toLowerCase().includes(q);
      const districtMatch = loc.district?.toLowerCase().includes(q);
      const stateFilterMatch = options?.state ? loc.state.toLowerCase() === options.state.toLowerCase() : true;
      return (nameMatch || districtMatch) && stateFilterMatch;
    });

    if (localMatches.length >= limit) {
      return localMatches.slice(0, limit);
    }

    // 2. OpenStreetMap Nominatim Query (Bounded to Northeast India)
    const env = getEnv();
    if (env.GEOCODING_PROVIDER === 'nominatim') {
      try {
        const viewbox = '87.0,29.5,97.5,21.0'; // Northeast India bounding box
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
        nominatimUrl.searchParams.set('q', `${query}, Northeast India`);
        nominatimUrl.searchParams.set('format', 'json');
        nominatimUrl.searchParams.set('viewbox', viewbox);
        nominatimUrl.searchParams.set('bounded', '1');
        nominatimUrl.searchParams.set('limit', String(limit));
        nominatimUrl.searchParams.set('addressdetails', '1');

        const res = await fetch(nominatimUrl.toString(), {
          headers: {
            'User-Agent': env.GEOCODING_USER_AGENT,
            'Accept-Language': 'en',
          },
        });

        if (res.ok) {
          const rawResults = (await res.json()) as Array<{
            place_id: number;
            display_name: string;
            lat: string;
            lon: string;
            type: string;
            address?: { state?: string; county?: string; city?: string; town?: string; village?: string };
          }>;

          const remoteMatches: GeocodingLocation[] = rawResults.map((item) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const isHilly = lat > 25.0 || lng > 93.0;

            return {
              id: `osm-${item.place_id}`,
              name: item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0],
              state: item.address?.state || 'Northeast India',
              district: item.address?.county,
              type: item.type || 'town',
              lat,
              lng,
              elevationMeters: isHilly ? 1200 : 80,
              accessibilityTier: isHilly ? 'LOW' : 'HIGH',
              roadAccessQuality: isHilly ? 'RESTRICTED' : 'ALL_WEATHER',
            };
          });

          // Merge local and remote avoiding duplicate coordinates
          const combined = [...localMatches];
          for (const rm of remoteMatches) {
            const exists = combined.some(
              (c) => Math.abs(c.lat - rm.lat) < 0.05 && Math.abs(c.lng - rm.lng) < 0.05
            );
            if (!exists && combined.length < limit) {
              combined.push(rm);
            }
          }

          return combined;
        }
      } catch (err) {
        console.warn('Nominatim lookup failed, returning local NER index:', err);
      }
    }

    return localMatches.slice(0, limit);
  }

  async reverse(lat: number, lng: number): Promise<GeocodingLocation | null> {
    // Find closest match in NER index
    let closest: GeocodingLocation | null = null;
    let minDistance = Infinity;

    for (const loc of NER_REFERENCE_LOCATIONS) {
      const d = Math.hypot(loc.lat - lat, loc.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = loc;
      }
    }

    if (minDistance < 0.2 && closest) {
      return closest;
    }

    return {
      id: `coord-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      name: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      state: 'Northeast Region',
      type: 'waypoint',
      lat,
      lng,
      elevationMeters: 500,
      accessibilityTier: 'MEDIUM',
      roadAccessQuality: 'ALL_WEATHER',
    };
  }
}

let _provider: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (!_provider) {
    _provider = new DefaultGeocodingProvider();
  }
  return _provider;
}
