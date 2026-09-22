import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/observability/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const prometheusText = metrics.formatPrometheus();

  return new NextResponse(prometheusText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
