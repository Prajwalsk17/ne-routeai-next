import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getRouteById, createRouteVersion } from '@/lib/services/route.service';
import { z } from 'zod';

const newVersionSchema = z.object({
  change_reason: z.string().min(3, 'Change reason must be specified'),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const route = await getRouteById(params.id, user);
    return apiSuccess(route);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:update');
    const body = await request.json();
    const parsed = newVersionSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const newVersion = await createRouteVersion(
      params.id,
      {
        changeReason: parsed.data.change_reason,
        originCoords: parsed.data.origin_coords,
        destinationCoords: parsed.data.destination_coords,
        constraints: {
          avoidCoordinates: parsed.data.avoid_coordinates,
        },
      },
      user
    );

    return apiSuccess(newVersion, { message: 'New route version created successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
