import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { analyticsQuerySchema } from '@/lib/validation';
import { generateAnalyticsSummary } from '@/lib/services/analytics.service';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = analyticsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const report = await generateAnalyticsSummary(
      {
        startDate: parsed.data.start_date,
        endDate: parsed.data.end_date,
        preset: parsed.data.preset,
        interval: parsed.data.interval,
        corridorId: parsed.data.corridor_id,
        fleetType: parsed.data.fleet_type,
        state: parsed.data.state,
        organizationId: parsed.data.organization_id,
      },
      sessionUser
    );

    return apiSuccess(report);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to generate analytics summary';
    return apiError(msg, 'ANALYTICS_GENERATION_ERROR', 500);
  }
}
