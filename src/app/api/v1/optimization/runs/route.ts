import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { optimizationQuerySchema } from '@/lib/validation';
import { listOptimizationRuns } from '@/lib/services/optimization.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      status: searchParams.get('status') || undefined,
      approval_status: searchParams.get('approval_status') || undefined,
      algorithm: searchParams.get('algorithm') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = optimizationQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await listOptimizationRuns(parsed.data, user);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
