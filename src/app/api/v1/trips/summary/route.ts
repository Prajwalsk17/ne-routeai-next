import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getTripSummary } from '@/lib/services/trip.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const summary = await getTripSummary(user);
    return apiSuccess(summary);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
