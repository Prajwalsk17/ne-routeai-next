import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { optimizationRejectSchema } from '@/lib/validation';
import { rejectOptimizationRun } from '@/lib/services/optimization.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();

    const parsed = optimizationRejectSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const run = await rejectOptimizationRun(params.id, parsed.data.reason, user);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
