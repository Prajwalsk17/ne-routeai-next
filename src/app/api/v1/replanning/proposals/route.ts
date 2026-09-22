import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { replanningQuerySchema } from '@/lib/validation';
import { listReplanningProposals } from '@/lib/services/replanning.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      trip_id: searchParams.get('trip_id') || undefined,
      trigger_type: searchParams.get('trigger_type') || undefined,
      status: searchParams.get('status') || undefined,
      requires_human_approval: searchParams.get('requires_human_approval') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = replanningQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await listReplanningProposals(parsed.data, user);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
