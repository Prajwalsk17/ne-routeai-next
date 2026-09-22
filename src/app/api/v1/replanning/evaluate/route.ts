import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { triggerReplanningSchema } from '@/lib/validation';
import { proposeReplanning } from '@/lib/services/replanning.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'routes:calculate');
    const body = await request.json();

    const parsed = triggerReplanningSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const proposal = await proposeReplanning(parsed.data, user);
    return apiSuccess(proposal, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
