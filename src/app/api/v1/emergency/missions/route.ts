import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, apiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { listMissions, saveMission, getActiveEmergencyCount } from '@/lib/services/emergency.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count_only') === 'true';

    if (countOnly) {
      return apiSuccess({ count: getActiveEmergencyCount() });
    }

    const missions = listMissions();
    return apiSuccess({ missions, count: missions.length, activeCount: getActiveEmergencyCount() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json();

    if (!body.mission_id) {
      return apiError('mission_id is required', 'VALIDATION_ERROR', 400);
    }

    const saved = saveMission(body);
    return apiSuccess(saved, { message: 'Emergency mission stored successfully.' });
  } catch (error) {
    return handleApiError(error);
  }
}
