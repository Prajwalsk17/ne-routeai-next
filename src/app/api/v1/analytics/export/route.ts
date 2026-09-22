import { NextRequest, NextResponse } from 'next/server';
import { apiError, apiValidationError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { analyticsExportSchema } from '@/lib/validation';
import { generateAnalyticsSummary, exportAnalyticsCSV } from '@/lib/services/analytics.service';
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

    const parsed = analyticsExportSchema.safeParse(queryParams);
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
        organizationId: parsed.data.organization_id,
      },
      sessionUser
    );

    const format = parsed.data.format || 'CSV';

    if (format === 'JSON') {
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics-report-${Date.now()}.json"`,
        },
      });
    }

    // Default to CSV export
    const csvContent = exportAnalyticsCSV(report);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-brief-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to export analytics data';
    return apiError(msg, 'ANALYTICS_EXPORT_ERROR', 500);
  }
}
