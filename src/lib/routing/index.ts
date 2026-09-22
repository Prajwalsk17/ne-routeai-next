/**
 * AuraNER / NER-Route AI — Routing & Geocoding Service Registry
 * 
 * Factory providing singleton instances of RoutingService and GeocodingService.
 * Supports clean provider substitution and deterministic test overrides.
 */

import { RoutingService, GeocodingService } from '@/lib/routing/types';
import { OsrmRoutingService } from '@/lib/routing/providers/osrm-routing.provider';
import { NominatimGeocodingService } from '@/lib/routing/providers/nominatim-geocoding.provider';

export * from '@/lib/routing/types';
export { OsrmRoutingService } from '@/lib/routing/providers/osrm-routing.provider';
export { NominatimGeocodingService } from '@/lib/routing/providers/nominatim-geocoding.provider';
export { MockTestRoutingService } from '@/lib/routing/providers/mock-routing.provider';
export { MockTestGeocodingService } from '@/lib/routing/providers/mock-geocoding.provider';

let activeRoutingService: RoutingService | null = null;
let activeGeocodingService: GeocodingService | null = null;

export function getRoutingService(): RoutingService {
  if (!activeRoutingService) {
    activeRoutingService = new OsrmRoutingService();
  }
  return activeRoutingService;
}

export function setRoutingServiceForTesting(service: RoutingService | null): void {
  activeRoutingService = service;
}

export function getGeocodingService(): GeocodingService {
  if (!activeGeocodingService) {
    activeGeocodingService = new NominatimGeocodingService();
  }
  return activeGeocodingService;
}

export function setGeocodingServiceForTesting(service: GeocodingService | null): void {
  activeGeocodingService = service;
}
