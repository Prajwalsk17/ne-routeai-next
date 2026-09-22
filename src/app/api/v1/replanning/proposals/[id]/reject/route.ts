import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { replanningRejectSchema } from '@/lib/validation';
import { rejectReplanning } from '@/lib/services/replanning.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json().catch(() => ({}));

    const parsed = replanningRejectSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const proposal = await rejectReplanning(params.id, parsed.data.rejection_reason, user);
    return apiSuccess(proposal);
  } catch (error) {
    return handleApiError(error);
  }
}
