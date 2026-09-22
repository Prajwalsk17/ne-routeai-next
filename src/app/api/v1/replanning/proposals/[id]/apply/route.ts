import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { applyReplanning } from '@/lib/services/replanning.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const proposal = await applyReplanning(params.id, user);
    return apiSuccess(proposal);
  } catch (error) {
    return handleApiError(error);
  }
}
