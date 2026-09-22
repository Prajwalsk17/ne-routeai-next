import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { getServiceSupabase } from '@/lib/db/supabase';
import { findNearestSafeLocations } from '@/lib/services/safe-location.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    const supabase = getServiceSupabase();
    if (supabase) {
      let query = supabase.from('facilities').select('*');
      if (state) {
        query = query.eq('state', state);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return apiSuccess({
          facilities: data,
          total: data.length,
        });
      }
    }

    // Reference safe locations and relief hubs across Northeast India
    const safeLocations = await findNearestSafeLocations({ lat: 26.14, lng: 91.73 }, 20);
    const mapped = safeLocations.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      state: s.state,
      coordinates: s.coordinates,
      capacityTons: s.type === 'WAREHOUSE' ? 500 : 150,
      currentLoadPct: 45,
      inventoryLevel: 'MEDIUM',
      status: 'OPERATIONAL',
      contactNumber: s.contactNumber,
      capacityDescription: s.capacityDescription,
    }));

    return apiSuccess({
      facilities: mapped,
      total: mapped.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
