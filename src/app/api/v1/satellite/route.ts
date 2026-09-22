import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { getSatelliteDataSummary } from '@/lib/services/satellite.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const summary = await getSatelliteDataSummary();
    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
