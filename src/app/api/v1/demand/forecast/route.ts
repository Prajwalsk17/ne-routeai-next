import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { forecastDemand } from '@/lib/engines/demand-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();

    const result = forecastDemand({
      location_id: body.location_id || 'LOC024',
      period_days: Number(body.period_days) || 30,
      season: body.season || 'MONSOON',
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
