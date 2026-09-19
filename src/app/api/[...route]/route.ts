import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, generateOTP, verifyOTP, setUserVerified, getAllLocations, getAllVehicles, getAllWarehouses, getAllHospitals, getAllRoadSegments, getAllDeliveries, getAllAlerts, getLocationById, logDecision, getDecisionLogs } from '@/lib/db';
import { verifyPassword, signToken, authenticateRequest } from '@/lib/auth';
import { generateCandidateRoutes } from '@/lib/engines/route-engine';
import { predictRisk, getAllRiskRegions } from '@/lib/engines/risk-engine';
import { getAccessibility, getAllAccessibility } from '@/lib/engines/accessibility-engine';
import { optimizeEmergencyMission } from '@/lib/engines/emergency-engine';
import { runSimulation } from '@/lib/engines/simulation-engine';
import { forecastDemand } from '@/lib/engines/demand-engine';
import { processCopilotQuery } from '@/lib/engines/copilot-engine';
import { DASHBOARD_STATS, ANALYTICS_DATA } from '@/lib/seed-data';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function unauthorized() {
  return json({ error: 'Unauthorized. Please login.' }, 401);
}

const PUBLIC_PATHS = ['auth/login', 'auth/signup', 'auth/verify-otp', 'auth/resend-otp', 'health'];

export async function GET(req: NextRequest, { params }: { params: { route: string[] } }) {
  const path = params.route.join('/');

  if (!PUBLIC_PATHS.includes(path)) {
    const user = authenticateRequest(req);
    if (!user) return unauthorized();
  }

  if (path === 'health') return json({ status: 'ok', version: '1.0.0' });
  if (path === 'dashboard') return json(DASHBOARD_STATS);
  if (path === 'locations') return json(getAllLocations());
  if (path === 'hospitals') return json(getAllHospitals());
  if (path === 'routes/segments') return json(getAllRoadSegments());
  if (path === 'risk/regions') return json(getAllRiskRegions());
  if (path.startsWith('risk/location/')) {
    const locId = path.split('/')[2];
    const horizon = parseInt(req.nextUrl.searchParams.get('horizon') || '24');
    return json(predictRisk(locId, horizon));
  }
  if (path === 'accessibility') return json(getAllAccessibility());
  if (path.startsWith('accessibility/')) {
    const locId = path.split('/')[1];
    const result = getAccessibility(locId);
    return result ? json(result) : json({ error: 'Location not found' }, 404);
  }
  if (path === 'deliveries/active') {
    const deliveries = getAllDeliveries() as any[];
    const locations = getAllLocations() as any[];
    const vehicles = getAllVehicles() as any[];
    const enriched = deliveries.map((d: any) => ({
      ...d,
      originId: d.origin_id, destinationId: d.destination_id, vehicleId: d.vehicle_id,
      cargoType: d.cargo_type, cargoWeightKg: d.cargo_weight_kg, progressPct: d.progress_pct,
      etaHours: d.eta_hours,
      origin: locations.find((l: any) => l.id === d.origin_id),
      destination: locations.find((l: any) => l.id === d.destination_id),
      vehicle: vehicles.find((v: any) => v.id === d.vehicle_id),
    }));
    return json(enriched);
  }
  if (path === 'fleet') {
    const vehicles = getAllVehicles() as any[];
    return json(vehicles.map((v: any) => ({
      ...v, capacityTons: v.capacity_tons, currentLocation: v.current_location,
      fuelPct: v.fuel_pct, riskTolerance: v.risk_tolerance,
    })));
  }
  if (path === 'warehouses') {
    const whs = getAllWarehouses() as any[];
    return json(whs.map((w: any) => ({
      ...w, locationId: w.location_id, capacityTons: w.capacity_tons,
      currentLoadPct: w.current_load_pct, inventoryLevel: w.inventory_level,
      riskScore: w.risk_score, accessibilityScore: w.accessibility_score,
    })));
  }
  if (path === 'alerts') {
    const severity = req.nextUrl.searchParams.get('severity') || undefined;
    return json(getAllAlerts(severity));
  }
  if (path === 'analytics') return json(ANALYTICS_DATA);
  if (path === 'map-data') {
    return json({
      locations: getAllLocations(), warehouses: getAllWarehouses(),
      hospitals: getAllHospitals(), vehicles: getAllVehicles(), alerts: getAllAlerts(),
    });
  }
  if (path === 'ai-decision/log') return json(getDecisionLogs());

  return json({ error: 'Not found' }, 404);
}

export async function POST(req: NextRequest, { params }: { params: { route: string[] } }) {
  const path = params.route.join('/');
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body */ }

  // --- AUTH: LOGIN (Step 1 — credentials → OTP sent) ---
  if (path === 'auth/login') {
    const email = (body.email as string || '').trim().toLowerCase();
    const password = body.password as string || '';
    if (!email || !password) return json({ error: 'Email and password are required.' }, 400);

    const user = getUserByEmail(email);
    if (!user) return json({ error: 'Invalid email or password.' }, 401);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return json({ error: 'Invalid email or password.' }, 401);

    // Allow 1-click demo bypass if requested
    if (body.auto_verify === true) {
      const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
      const res = json({
        requires_verification: false,
        token,
        user: { name: user.name, role: user.role, email: user.email },
        message: 'Login successful.',
      });
      res.cookies.set('ner_token', token, {
        path: '/',
        httpOnly: false,
        maxAge: 86400,
        sameSite: 'lax',
      });
      return res;
    }

    // Generate OTP for 2FA
    const otp = generateOTP(email, 'login');
    console.log(`🔐 [OTP] Login verification code for ${email}: ${otp}`);

    return json({
      requires_verification: true,
      email: user.email,
      otp_preview: otp, // Displayed on frontend for ease of use
      message: 'Verification code sent. Please check your email.',
    });
  }

  // --- AUTH: SIGNUP ---
  if (path === 'auth/signup') {
    const email = (body.email as string || '').trim().toLowerCase();
    const password = body.password as string || '';
    const name = (body.name as string || '').trim();
    const role = (body.role as string || 'operator').trim();

    if (!email || !password || !name) {
      return json({ error: 'Name, email, and password are required.' }, 400);
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return json({ error: 'An account with this email already exists.' }, 409);
    }

    createUser(email, password, name, role);

    // Generate OTP for email verification
    const otp = generateOTP(email, 'signup');
    console.log(`🔐 [OTP] Signup verification code for ${email}: ${otp}`);

    return json({
      requires_verification: true,
      email,
      otp_preview: otp,
      message: 'Account created. Verification code sent to your email.',
    });
  }

  // --- AUTH: VERIFY OTP (Step 2 — OTP → JWT token) ---
  if (path === 'auth/verify-otp') {
    const email = (body.email as string || '').trim().toLowerCase();
    const code = (body.code as string || '').trim();
    const purpose = (body.purpose as string || 'login');

    if (!email || !code) {
      return json({ error: 'Email and verification code are required.' }, 400);
    }

    const valid = verifyOTP(email, code, purpose);
    if (!valid) {
      return json({ error: 'Invalid or expired verification code.' }, 401);
    }

    // Mark user as verified (for signup)
    if (purpose === 'signup') {
      setUserVerified(email);
    }

    let user = getUserByEmail(email);
    if (!user) {
      // In serverless environments if container rotated between signup and verify-otp:
      const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const role = email.includes('officer') || email.includes('admin') ? 'officer' : 'operator';
      try {
        createUser(email, 'VerifiedPass123!', name, role);
        setUserVerified(email);
        user = getUserByEmail(email);
      } catch {
        user = { id: 'usr_' + Date.now().toString(36), email, name, role };
      }
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    const res = json({
      token,
      user: { name: user.name, role: user.role, email: user.email },
      message: 'Verification successful. You are now logged in.',
    });
    // Set cookie for Next.js middleware and SSR
    res.cookies.set('ner_token', token, {
      path: '/',
      httpOnly: false,
      maxAge: 86400,
      sameSite: 'lax',
    });
    return res;
  }

  // --- AUTH: RESEND OTP ---
  if (path === 'auth/resend-otp') {
    const email = (body.email as string || '').trim().toLowerCase();
    const purpose = (body.purpose as string || 'login');

    if (!email) return json({ error: 'Email is required.' }, 400);

    const user = getUserByEmail(email);
    if (!user) return json({ error: 'No account found with this email.' }, 404);

    const otp = generateOTP(email, purpose);
    console.log(`🔐 [OTP] Resent code for ${email}: ${otp}`);

    return json({
      email,
      otp_preview: otp,
      message: 'New verification code sent.',
    });
  }

  // All other POST routes require auth
  const authUser = authenticateRequest(req);
  if (!authUser) return unauthorized();

  if (path === 'routes/analyze') {
    return json(generateCandidateRoutes({
      origin_id: body.origin_id as string, destination_id: body.destination_id as string,
      cargo_type: body.cargo_type as string || 'General', cargo_weight_kg: (body.cargo_weight_kg as number) || 1000,
      vehicle_type: body.vehicle_type as string || 'TRUCK', priority: (body.priority as any) || 'MEDIUM',
    }));
  }
  if (path === 'risk/predict') {
    return json(predictRisk(body.location_id as string, (body.horizon_hours as number) || 24));
  }
  if (path === 'emergency/optimize') {
    return json(optimizeEmergencyMission({
      mission_type: body.mission_type as string || 'Medical', origin_id: body.origin_id as string,
      destination_id: body.destination_id as string, cargo_type: body.cargo_type as string || 'Emergency Medicine',
      cargo_weight_kg: (body.cargo_weight_kg as number) || 500, required_eta_hours: body.required_eta_hours as number,
      priority: (body.priority as any) || 'CRITICAL',
    }));
  }
  if (path === 'simulation/run') {
    return json(runSimulation({
      scenario_type: body.scenario_type as any || 'LANDSLIDE', severity: (body.severity as number) || 0.7,
      duration_hours: (body.duration_hours as number) || 24, location_id: body.location_id as string,
    }));
  }
  if (path === 'demand/forecast') {
    return json(forecastDemand({
      location_id: body.location_id as string, period_days: (body.period_days as number) || 30,
      season: (body.season as any) || 'MONSOON',
    }));
  }
  if (path === 'copilot/query') {
    return json(processCopilotQuery(body.query as string || ''));
  }
  if (path === 'ai-decision/override') {
    logDecision(body.action as string || 'override', body.reason as string || '');
    return json({ status: 'logged' });
  }

  return json({ error: 'Not found' }, 404);
}
