import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { telemetryMapMatchSchema } from '@/lib/validation';
import { getMapMatchingEngine } from '@/lib/adapters/geocoding';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = telemetryMapMatchSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400, parsed.error.format());
    }

    const { trace, vehicle_profile } = parsed.data;
    const engine = getMapMatchingEngine();

    const matchResult = await engine.matchGpsTrace(trace, {
      vehicleProfile: vehicle_profile,
    });

    return apiSuccess(matchResult, {
      pointsCount: trace.length,
      engine: matchResult.engine,
      confidence: matchResult.matchConfidence,
    });
  } catch (err: unknown) {
    console.error('Error in telemetry map matching endpoint:', err);
    return apiError('Failed to execute map matching on GPS trace', 'INTERNAL_ERROR', 500);
  }
}
