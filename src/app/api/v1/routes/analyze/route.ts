import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { generateCandidateRoutes } from '@/lib/engines/route-engine';
import type { RouteAnalyzeParams } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const body = (await request.json()) as RouteAnalyzeParams;

    const result = generateCandidateRoutes({
      origin_id: body.origin_id,
      destination_id: body.destination_id,
      cargo_type: body.cargo_type || 'General',
      cargo_weight_kg: Number(body.cargo_weight_kg) || 1000,
      vehicle_type: body.vehicle_type || 'TRUCK',
      priority: body.priority || 'MEDIUM',
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
