import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { listRoutes, saveRoute } from '@/lib/services/route.service';
import { z } from 'zod';

const saveRouteSchema = z.object({
  name: z.string().min(2, 'Route name must be at least 2 characters'),
  origin_location_id: z.string().min(1, 'Origin location is required'),
  destination_location_id: z.string().min(1, 'Destination location is required'),
  corridor_highway_code: z.string().optional(),
  is_template: z.boolean().optional(),
  origin_coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination_coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  avoid_coordinates: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const { routes, total } = await listRoutes({ search, limit, offset }, user);
    return apiSuccess(routes, { count: routes.length, total });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:create');
    const body = await request.json();
    const parsed = saveRouteSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const saved = await saveRoute(
      {
        name: parsed.data.name,
        originLocationId: parsed.data.origin_location_id,
        destinationLocationId: parsed.data.destination_location_id,
        corridorHighwayCode: parsed.data.corridor_highway_code,
        isTemplate: parsed.data.is_template,
        originCoords: parsed.data.origin_coords,
        destinationCoords: parsed.data.destination_coords,
        constraints: {
          avoidCoordinates: parsed.data.avoid_coordinates,
        },
      },
      user
    );

    return apiSuccess(saved, { message: 'Route corridor saved successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
