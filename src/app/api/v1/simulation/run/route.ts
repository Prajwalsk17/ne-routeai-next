import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { runSimulation } from '@/lib/engines/simulation-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();

    const result = runSimulation({
      scenario_type: body.scenario_type || 'LANDSLIDE',
      severity: Number(body.severity) || 0.7,
      duration_hours: Number(body.duration_hours) || 24,
      location_id: body.location_id || 'LOC002',
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
