import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getDriverSummary } from '@/lib/services/driver.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'drivers:read');
    const summary = await getDriverSummary(user);
    return apiSuccess(summary);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
