import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { locationSearchSchema } from '@/lib/validation';
import { getGeocodingProvider } from '@/lib/providers/geocoding.provider';
import { getWeatherProvider } from '@/lib/providers/weather.provider';
import { findNearestSafeLocations } from '@/lib/services/safe-location.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj = {
      q: searchParams.get('q') || '',
      state: searchParams.get('state') || undefined,
      type: searchParams.get('type') || undefined,
      limit: searchParams.get('limit') || 10,
    };

    const parsed = locationSearchSchema.safeParse(queryObj);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { q, state, limit } = parsed.data;
    const geocoding = getGeocodingProvider();
    const weatherProvider = getWeatherProvider();

    // 1. Search geographic points
    const locations = await geocoding.search(q, { state, limit });

    // 2. Enrich the top 3 results with live weather & nearest safe staging depot
    const enriched = await Promise.all(
      locations.map(async (loc, index) => {
        // Only fetch weather for top 3 to keep response time ultra-fast (<200ms)
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

    return apiSuccess(enriched, {
      count: enriched.length,
      query: q,
      stateFilter: state || 'ALL_NER',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Location search failed';
    return apiError(msg, 'SEARCH_ERROR', 500);
  }
}
