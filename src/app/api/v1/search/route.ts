import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { locationSearchSchema } from '@/lib/validation';
import { getGeocodingProvider } from '@/lib/providers/geocoding.provider';
import { getWeatherProvider } from '@/lib/providers/weather.provider';
import { findNearestSafeLocations } from '@/lib/services/safe-location.service';
import { getSession } from '@/lib/auth/session';
import { listShipments } from '@/lib/services/shipment.service';
import { listVehicles } from '@/lib/services/fleet.service';
import { listDrivers } from '@/lib/services/driver.service';

export interface UnifiedSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'LOCATION' | 'SHIPMENT' | 'VEHICLE' | 'DRIVER' | 'WAREHOUSE';
  href: string;
  badge?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isGlobal = searchParams.get('global') === 'true';
    const queryObj = {
      q: searchParams.get('q') || '',
      state: searchParams.get('state') || undefined,
      type: searchParams.get('type') || undefined,
      limit: searchParams.get('limit') || (isGlobal ? 5 : 10),
    };

    const parsed = locationSearchSchema.safeParse(queryObj);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { q, state, limit } = parsed.data;
    const qLower = q.toLowerCase();
    const geocoding = getGeocodingProvider();
    const weatherProvider = getWeatherProvider();

    // 1. Search geographic points
    const locations = await geocoding.search(q, { state, limit });

    // 2. Enrich the top 3 results with live weather & nearest safe staging depot
    const enriched = await Promise.all(
      locations.map(async (loc, index) => {
        let liveWeather = null;
        let nearestSafe = null;

        if (index < 3) {
          try {
            liveWeather = await weatherProvider.getWeather(loc.lat, loc.lng);
            const safeHavens = await findNearestSafeLocations({ lat: loc.lat, lng: loc.lng }, 1);
            nearestSafe = safeHavens[0] || null;
          } catch {
            // Non-blocking enrichment
          }
        }

        return {
          ...loc,
          liveWeather,
          nearestSafeLocation: nearestSafe,
        };
      })
    );

    // If not global search, return locations array directly for backward compatibility
    if (!isGlobal) {
      return apiSuccess(enriched, {
        count: enriched.length,
        query: q,
        stateFilter: state || 'ALL_NER',
      });
    }

    // 3. Global Multi-Entity Search across authorized resources
    const sessionUser = await getSession(request);
    let shipmentsList: any[] = [];
    let vehiclesList: any[] = [];
    let driversList: any[] = [];

    if (sessionUser) {
      try {
        const [shpRes, fltRes, drvRes] = await Promise.all([
          listShipments({ search: q, limit: 5 }, sessionUser).catch(() => ({ shipments: [], total: 0 })),
          listVehicles({ search: q, limit: 5 }, sessionUser).catch(() => ({ vehicles: [], total: 0 })),
          listDrivers({ search: q, limit: 5 }, sessionUser).catch(() => ({ drivers: [], total: 0 })),
        ]);
        shipmentsList = shpRes.shipments;
        vehiclesList = fltRes.vehicles;
        driversList = drvRes.drivers;
      } catch {
        // Fallback to empty if tenant query fails
      }
    }

    // 4. Facilities / Warehouses search
    const allSafeLocations = await findNearestSafeLocations({ lat: 26.14, lng: 91.73 }, 40).catch(() => []);
    const matchingFacilities = allSafeLocations
      .filter((s) => s.name.toLowerCase().includes(qLower) || s.state.toLowerCase().includes(qLower) || s.type.toLowerCase().includes(qLower))
      .slice(0, 5);

    // 5. Aggregate into unified categorized search items
    const unifiedItems: UnifiedSearchResult[] = [
      ...shipmentsList.map((s) => ({
        id: `shp-${s.id}`,
        title: s.shipmentCode,
        subtitle: `${s.cargoType || 'Cargo'} • ${s.originFacilityName || 'Origin'} → ${s.destinationFacilityName || 'Destination'}`,
        category: 'SHIPMENT' as const,
        href: `/shipments`,
        badge: s.status,
      })),
      ...vehiclesList.map((v) => ({
        id: `veh-${v.id}`,
        title: v.registrationNumber,
        subtitle: `${v.makeModel} • Capacity: ${v.payloadCapacityKg} kg`,
        category: 'VEHICLE' as const,
        href: `/fleet`,
        badge: v.status,
      })),
      ...driversList.map((d) => ({
        id: `drv-${d.id}`,
        title: d.name,
        subtitle: `${d.phone} • License: ${d.licenseNumber} • Exp: ${d.mountainExperienceYears} yrs`,
        category: 'DRIVER' as const,
        href: `/drivers`,
        badge: d.dutyStatus,
      })),
      ...matchingFacilities.map((f) => ({
        id: `fac-${f.id}`,
        title: f.name,
        subtitle: `${f.type} in ${f.state} • Safe haven hub`,
        category: 'WAREHOUSE' as const,
        href: `/warehouses`,
        badge: f.type,
      })),
      ...enriched.map((l) => ({
        id: `loc-${l.id}`,
        title: l.name,
        subtitle: `${l.state} • Coordinates: ${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`,
        category: 'LOCATION' as const,
        href: `/routes`,
        badge: l.type?.toUpperCase() || 'POINT',
      })),
    ];

    return apiSuccess(
      {
        items: unifiedItems,
        locations: enriched,
        shipments: shipmentsList,
        vehicles: vehiclesList,
        drivers: driversList,
        warehouses: matchingFacilities,
      },
      {
        count: unifiedItems.length,
        query: q,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Location search failed';
    return apiError(msg, 'SEARCH_ERROR', 500);
  }
}
