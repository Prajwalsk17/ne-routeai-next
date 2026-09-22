import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response';
import { getGeocodingService } from '@/lib/routing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const geocoding = getGeocodingService();

    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    // Reverse Geocoding
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) {
        return apiError('Invalid latitude or longitude coordinates', 'VALIDATION_ERROR', 400);
      }

      const result = await geocoding.reverseGeocode({ lat, lng });
      if (!result) {
        return apiError('No address found for coordinates', 'NOT_FOUND', 404);
      }
      return apiSuccess(result);
    }

    // Forward Search Geocoding
    const query = searchParams.get('q');
    if (!query || query.trim().length === 0) {
      return apiError('Search query "q" or "lat"/"lng" coordinates required', 'VALIDATION_ERROR', 400);
    }

    const state = searchParams.get('state') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10;

    const results = await geocoding.geocode(query.trim(), { state, limit });
    return apiSuccess(results, { count: results.length, query });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
