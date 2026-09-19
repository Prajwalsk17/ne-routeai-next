import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { matrixOptimizationSchema } from '@/lib/validation';
import { getRoutingAdapter } from '@/lib/adapters/routing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = matrixOptimizationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400, parsed.error.format());
    }

    const { origins, destinations, consider_traffic } = parsed.data;
    const routingAdapter = getRoutingAdapter();

    const matrix = await routingAdapter.calculateMatrix({
      origins,
      destinations,
      considerTraffic: consider_traffic,
    });

    return apiSuccess(matrix, {
      originsCount: origins.length,
      destinationsCount: destinations.length,
      engine: matrix.engine,
    });
  } catch (err: unknown) {
    console.error('Error in distance-time matrix endpoint:', err);
    return apiError('Failed to compute distance-time matrix', 'INTERNAL_ERROR', 500);
  }
}
