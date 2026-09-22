import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getFleetSummary } from '@/lib/services/fleet.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'fleet:read');
    const summary = await getFleetSummary(user);
    return apiSuccess(summary);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
