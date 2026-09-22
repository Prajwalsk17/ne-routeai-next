import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getOptimizationRunById } from '@/lib/services/optimization.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'data:read');
    const run = await getOptimizationRunById(params.id, user);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
