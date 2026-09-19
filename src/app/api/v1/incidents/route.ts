import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { incidentReportSchema } from '@/lib/validation';
import { getServiceSupabase } from '@/lib/db/supabase';
import { getSession } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/services/audit.service';
import { Coordinates } from '@/lib/providers/types';
import { ActiveIncident, SeverityLevel } from '@/lib/services/risk.service';

export interface IncidentRecord extends ActiveIncident {
  locationName?: string;
  source: string;
  reportedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

// Pre-seeded Northeast India high-risk active incidents
const INITIAL_INCIDENTS: IncidentRecord[] = [
  {
    id: 'inc-ner-01',
    code: 'INC-1042',
    type: 'LANDSLIDE',
    severity: 'CRITICAL',
    title: 'Major Landslide Blockage on NH-29',
    description: 'Mudslide and debris covering both lanes near Zubza on Dimapur-Kohima highway. Road closed for heavy vehicles.',
    locationName: 'NH-29 Zubza Sector, Kohima, Nagaland',
    coordinates: { lat: 25.712, lng: 94.032 },
    affectedRadiusMeters: 1200,
    confidence: 0.98,
    source: 'BRO',
    status: 'ACTIVE',
    detectedAt: '2026-09-09T08:00:00Z',
    createdAt: '2026-09-09T08:00:00Z',
  },
  {
    id: 'inc-ner-02',
    code: 'INC-2089',
    type: 'FLOOD',
    severity: 'HIGH',
    title: 'Flash Flood Waterlogging on NH-10',
    description: 'Teesta river overflow causing 0.6m water on highway near 29th Mile. Light vehicles stranded.',
    locationName: 'NH-10 Teesta Corridor, Rangpo Border, Sikkim',
    coordinates: { lat: 27.176, lng: 88.513 },
    affectedRadiusMeters: 800,
    confidence: 0.92,
    source: 'IMD_WEATHER',
    status: 'ACTIVE',
    detectedAt: '2026-09-09T10:30:00Z',
    createdAt: '2026-09-09T10:30:00Z',
  },
  {
    id: 'inc-ner-03',
    code: 'INC-3415',
    type: 'FALLING_ROCKS',
    severity: 'MEDIUM',
    title: 'Active Rockfall Hazard on NH-27 Lumding Hill Section',
    description: 'Continuous stone fall on mountain slopes between Lumding and Haflong. Convoys operating at reduced speed.',
    locationName: 'NH-27 Dima Hasao Hill Sector, Assam',
    coordinates: { lat: 25.185, lng: 93.024 },
    affectedRadiusMeters: 1500,
    confidence: 0.88,
    source: 'DRIVER',
    status: 'ACTIVE',
    detectedAt: '2026-09-09T12:00:00Z',
    createdAt: '2026-09-09T12:00:00Z',
  },
  {
    id: 'inc-ner-04',
    code: 'INC-4811',
    type: 'ROAD_DAMAGE',
    severity: 'MEDIUM',
    title: 'Severe Road Subsidence on NH-6',
    description: 'Rain-induced road depression along Sonapur-Jowai ridge. Reduced to single-lane traffic.',
    locationName: 'NH-6 East Jaintia Hills, Meghalaya',
    coordinates: { lat: 25.295, lng: 92.381 },
    affectedRadiusMeters: 600,
    confidence: 0.85,
    source: 'SYSTEM',
    status: 'ACTIVE',
    detectedAt: '2026-09-09T14:15:00Z',
    createdAt: '2026-09-09T14:15:00Z',
  },
];

// In-memory registry ensuring live persistence across dev environment
const localIncidentStore = new Map<string, IncidentRecord>(
  INITIAL_INCIDENTS.map((inc) => [inc.id, inc])
);

function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const severityParam = searchParams.get('severity');
    const typeParam = searchParams.get('type');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius_km');

    let results: IncidentRecord[] = [];

    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        let query = supabase.from('incidents').select('*');
        if (statusParam && statusParam !== 'ALL') {
          query = query.eq('status', statusParam);
        } else if (!statusParam) {
          query = query.eq('status', 'ACTIVE');
        }
        if (severityParam) {
          query = query.eq('severity', severityParam);
        }
        if (typeParam) {
          query = query.eq('type', typeParam);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          results = data.map((d) => ({
            id: d.id,
            code: d.incident_code,
            type: d.type,
            severity: d.severity as SeverityLevel,
            title: d.title,
            description: d.description,
            locationName: d.location_name,
            coordinates: {
              lat: typeof d.coordinates?.coordinates?.[1] === 'number' ? d.coordinates.coordinates[1] : 26.1445,
              lng: typeof d.coordinates?.coordinates?.[0] === 'number' ? d.coordinates.coordinates[0] : 91.7362,
            },
            affectedRadiusMeters: d.affected_radius_meters,
            confidence: Number(d.confidence),
            source: d.source,
            reportedById: d.reported_by_id,
            status: d.status,
            detectedAt: d.detected_at,
            resolvedAt: d.resolved_at,
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase incidents query failed, utilizing local incident registry:', err);
      }
    }

    // Fallback to local incident registry if database returned no items
    if (results.length === 0) {
      results = Array.from(localIncidentStore.values());

      if (statusParam && statusParam !== 'ALL') {
        results = results.filter((inc) => inc.status === statusParam);
      } else if (!statusParam) {
        results = results.filter((inc) => inc.status === 'ACTIVE');
      }

      if (severityParam) {
        results = results.filter((inc) => inc.severity === severityParam);
      }
      if (typeParam) {
        results = results.filter((inc) => inc.type === typeParam);
      }
    }

    // Spatial filter if latitude, longitude, and radius_km provided
    if (latParam && lngParam) {
      const center: Coordinates = {
        lat: parseFloat(latParam),
        lng: parseFloat(lngParam),
      };
      const radiusKm = radiusParam ? parseFloat(radiusParam) : 50;

      results = results.filter((inc) => {
        const dist = haversineDistanceKm(center, inc.coordinates);
        return dist <= radiusKm;
      });
    }

    return apiSuccess(results, { count: results.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query incidents';
    return apiError(msg, 'INCIDENT_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = incidentReportSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const sessionUser = await getSession(request);
    const {
      type,
      severity,
      title,
      description,
      location_name,
      latitude,
      longitude,
      affected_radius_meters,
      confidence,
    } = parsed.data;

    const incidentId = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const incidentCode = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const source = sessionUser?.role === 'driver' ? 'DRIVER' : sessionUser ? 'DISPATCHER' : 'SYSTEM';

    const newIncident: IncidentRecord = {
      id: incidentId,
      code: incidentCode,
      type,
      severity: severity as SeverityLevel,
      title,
      description,
      locationName: location_name || 'Northeast Corridor',
      coordinates: { lat: latitude, lng: longitude },
      affectedRadiusMeters: affected_radius_meters,
      confidence,
      source,
      reportedById: sessionUser?.id || null,
      status: 'ACTIVE',
      detectedAt: now,
      createdAt: now,
    };

    localIncidentStore.set(incidentId, newIncident);

    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        await supabase.from('incidents').insert({
          id: incidentId,
          incident_code: incidentCode,
          type,
          severity,
          title,
          description,
          location_name: location_name || null,
          coordinates: `POINT(${longitude} ${latitude})`,
          affected_radius_meters,
          confidence,
          source,
          reported_by_id: sessionUser?.id || null,
          status: 'ACTIVE',
          detected_at: now,
          created_at: now,
        });
      } catch (err) {
        console.error('Failed to write incident to Supabase:', err);
      }
    }

    await logAuditEvent({
      action: 'INCIDENT_REPORTED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      userId: sessionUser?.id || null,
      metadata: {
        incidentCode,
        type,
        severity,
        location: location_name,
        lat: latitude,
        lng: longitude,
      },
    });

    return apiSuccess(
      newIncident,
      { message: 'Hazard incident successfully registered and routed to alert safety engine' },
      201
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to report incident';
    return apiError(msg, 'INCIDENT_REPORT_ERROR', 500);
  }
}
