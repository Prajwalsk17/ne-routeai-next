import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { replanningApproveSchema } from '@/lib/validation';
import { approveReplanning } from '@/lib/services/replanning.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json().catch(() => ({}));

    const parsed = replanningApproveSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const proposal = await approveReplanning(
      params.id,
      parsed.data.comments,
      user,
      parsed.data.apply_immediately
    );
    return apiSuccess(proposal);
  } catch (error) {
    return handleApiError(error);
  }
}
