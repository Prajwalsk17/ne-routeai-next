/**
 * AuraNER / NER-Route AI — Automated Test Mock Geocoding Provider
 * 
 * FOR AUTOMATED TESTING ONLY.
 * Deterministic geocoding without external network requests.
 */

import {
  Coordinates,
  GeocodingService,
  GeocodedLocation,
  GeocodeOptions,
} from '@/lib/routing/types';

export class MockTestGeocodingService implements GeocodingService {
  public readonly providerName = 'Mock Test Geocoding Engine (Test Runner Only)';

  private mockLocations: GeocodedLocation[] = [
    {
      id: 'loc-gau',
      name: 'Guwahati',
      formattedAddress: 'Guwahati, Assam, India',
      lat: 26.1445,
      lng: 91.7362,
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      type: 'city',
      elevationMeters: 55,
      provenance: { providerName: this.providerName, timestamp: new Date().toISOString() },
    },
    {
      id: 'loc-tez',
      name: 'Tezpur',
      formattedAddress: 'Tezpur, Sonitpur, Assam, India',
      lat: 26.6338,
      lng: 92.8004,
      state: 'Assam',
      district: 'Sonitpur',
      type: 'town',
      elevationMeters: 79,
      provenance: { providerName: this.providerName, timestamp: new Date().toISOString() },
    },
    {
      id: 'loc-bom',
      name: 'Bomdila',
      formattedAddress: 'Bomdila, West Kameng, Arunachal Pradesh, India',
      lat: 27.2647,
      lng: 92.4178,
      state: 'Arunachal Pradesh',
      district: 'West Kameng',
      type: 'town',
      elevationMeters: 2415,
      provenance: { providerName: this.providerName, timestamp: new Date().toISOString() },
    },
  ];

  async geocode(query: string, options?: GeocodeOptions): Promise<GeocodedLocation[]> {
    const q = query.trim().toLowerCase();
    const matches = this.mockLocations.filter(
      (l) => l.name.toLowerCase().includes(q) || l.formattedAddress.toLowerCase().includes(q)
    );
    if (matches.length > 0) return matches;

    // Return dummy location for test queries
    return [
      {
        id: `mock-${Date.now()}`,
        name: query,
        formattedAddress: `${query}, Northeast India`,
        lat: 26.0,
        lng: 92.0,
        state: 'Assam',
        provenance: { providerName: this.providerName, timestamp: new Date().toISOString() },
      },
    ];
  }

  async reverseGeocode(coords: Coordinates): Promise<GeocodedLocation | null> {
    return {
      id: `mock-rev-${coords.lat}-${coords.lng}`,
      name: `Point [${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}]`,
      formattedAddress: `Coordinates: ${coords.lat}, ${coords.lng}`,
      lat: coords.lat,
      lng: coords.lng,
      state: 'Assam',
      provenance: { providerName: this.providerName, timestamp: new Date().toISOString() },
    };
  }
}
