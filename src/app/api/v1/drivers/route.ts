import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { driverCreateSchema, driverFilterSchema } from '@/lib/validation';
import { listDrivers, createDriver } from '@/lib/services/driver.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'drivers:read');
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const parsedFilter = driverFilterSchema.safeParse(queryObj);
    if (!parsedFilter.success) {
      return apiValidationError(parsedFilter.error);
    }

    const { drivers, total } = await listDrivers(parsedFilter.data, user);
    return apiSuccess(drivers, {
      count: drivers.length,
      total,
      limit: parsedFilter.data.limit,
      offset: parsedFilter.data.offset,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'drivers:manage');
    const body = await request.json();
    const parsed = driverCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const driver = await createDriver(
      {
        userId: null,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        licenseNumber: parsed.data.license_number,
        licenseExpiry: parsed.data.license_expiry,
        mountainExperienceYears: parsed.data.mountain_experience_years,
        dutyStatus: parsed.data.duty_status,
        currentVehicleId: parsed.data.current_vehicle_id ?? null,
        safetyScore: 100,
      },
      user
    );

    return apiSuccess(driver, { message: 'Driver onboarded successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
