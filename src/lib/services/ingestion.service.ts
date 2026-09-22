/**
 * AuraNER / NER-Route AI — Phase 14: NER Data Ingestion & Provenance Engine
 * 
 * Production-grade data ingestion architecture for Northeast India:
 * - Data Source Registry (IMD, BRO, CWC, SDMA, OpenStreetMap NER)
 * - Ingestion Run Orchestrator with execution stats & duration tracking
 * - Strict Zod validation & unit normalization
 * - Northeast India geographic bounding box validation
 * - Deterministic SHA-256 payload deduplication
 * - Dynamic temporal freshness calculation (FRESH, STALE, EXPIRED)
 * - Retry logic with bounded exponential backoff
 * - Tamper-evident audit trail integration
 * - Zero-fabrication invariant
 */

import { createHash } from 'crypto';
import {
  DataSource,
  DataIngestionRun,
  WeatherEvent,
  RoadEvent,
  AccessibilityEvent,
  IngestionExecutionResult,
  IngestionStatus,
  IngestionTriggerMode,
  EventFreshnessStatus,
  EventProvenance,
  WeatherConditionCode,
  RoadBlockageType,
  RoadDisruptionReason,
  AccessibilityTier,
} from '@/lib/types/ingestion';
import {
  createDataSourceSchema,
  updateDataSourceSchema,
  externalWeatherRecordSchema,
  externalRoadEventRecordSchema,
  externalAccessibilityRecordSchema,
  ingestionEventQuerySchema,
} from '@/lib/validation';
import { SessionUser } from '@/lib/auth/session';
import { NotFoundError, BadRequestError } from '@/lib/api/response';
import { logAuditEvent } from '@/lib/services/audit.service';
import { getServiceSupabase } from '@/lib/db/supabase';

// -----------------------------------------------------------------------------
// Northeast India Operational Geofence Boundary
// -----------------------------------------------------------------------------
export const NER_GEO_BOUNDS = {
  minLat: 21.5,
  maxLat: 29.5,
  minLng: 88.0, // Encompasses Sikkim (88.0E - 88.9E) through Eastern Arunachal Pradesh (97.5E)
  maxLng: 97.5,
};

export function isWithinNerBounds(lat: number, lng: number): boolean {
  return (
    lat >= NER_GEO_BOUNDS.minLat &&
    lat <= NER_GEO_BOUNDS.maxLat &&
    lng >= NER_GEO_BOUNDS.minLng &&
    lng <= NER_GEO_BOUNDS.maxLng
  );
}

// -----------------------------------------------------------------------------
// In-Memory Storage & Registry
// -----------------------------------------------------------------------------
const localDataSources = new Map<string, DataSource>();
const localIngestionRuns = new Map<string, DataIngestionRun>();
const localWeatherEvents = new Map<string, WeatherEvent>();
const localRoadEvents = new Map<string, RoadEvent>();
const localAccessibilityEvents = new Map<string, AccessibilityEvent>();
const ingestedPayloadHashes = new Set<string>();

// -----------------------------------------------------------------------------
// Default Authoritative NER Sources Catalog
// -----------------------------------------------------------------------------
export const DEFAULT_AUTHORITATIVE_SOURCES: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt' | 'consecutiveFailures' | 'lastSuccessAt' | 'lastFailureAt'>[] = [
  {
    code: 'IMD_AWS',
    name: 'India Meteorological Department (NER Automatic Weather Stations)',
    providerType: 'REST_API',
    endpointUrl: 'https://mausam.imd.gov.in/api/ner/aws',
    fetchIntervalSeconds: 1800, // 30 minutes
    state: 'ALL_NER',
    isActive: true,
    freshnessTtlSeconds: 3600, // 1 hour
  },
  {
    code: 'BRO_ROAD_BULLETINS',
    name: 'Border Roads Organisation (Highway Disruption Bulletins)',
    providerType: 'GOV_BULLETIN',
    endpointUrl: 'https://bro.gov.in/api/v1/corridor-bulletins/ner',
    fetchIntervalSeconds: 3600, // 1 hour
    state: 'ALL_NER',
    isActive: true,
    freshnessTtlSeconds: 14400, // 4 hours
  },
  {
    code: 'CWC_FLOOD_GAUGE',
    name: 'Central Water Commission (Brahmaputra & Barak River Flood Stages)',
    providerType: 'HYDRO_GAUGE',
    endpointUrl: 'https://ffs.india-water.gov.in/api/ner/hydro-gauges',
    fetchIntervalSeconds: 3600,
    state: 'ASSAM',
    isActive: true,
    freshnessTtlSeconds: 7200, // 2 hours
  },
  {
    code: 'SDMA_DISASTER_PORTAL',
    name: 'State Disaster Management Authority (Village Isolation Declarations)',
    providerType: 'DISASTER_ALERT',
    endpointUrl: 'https://sdma.assam.gov.in/api/disaster-alerts',
    fetchIntervalSeconds: 7200, // 2 hours
    state: 'ALL_NER',
    isActive: true,
    freshnessTtlSeconds: 21600, // 6 hours
  },
  {
    code: 'OPENSTREETMAP_NER',
    name: 'OpenStreetMap NER Overpass Infrastructure Feed',
    providerType: 'GEOJSON_FEED',
    endpointUrl: 'https://overpass-api.de/api/interpreter',
    fetchIntervalSeconds: 86400, // 24 hours
    state: 'ALL_NER',
    isActive: true,
    freshnessTtlSeconds: 172800, // 48 hours
  },
];

export function seedDefaultDataSources(): void {
  const now = new Date().toISOString();
  for (const src of DEFAULT_AUTHORITATIVE_SOURCES) {
    if (!Array.from(localDataSources.values()).some((s) => s.code === src.code)) {
      const id = `src-${src.code.toLowerCase().replace(/_/g, '-')}`;
      localDataSources.set(id, {
        ...src,
        id,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

// Seed upon module initialization
seedDefaultDataSources();

// -----------------------------------------------------------------------------
// Provenance & Deduplication Helpers
// -----------------------------------------------------------------------------
export function computePayloadHash(data: unknown): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex');
}

export function calculateEventFreshness(observedAtIso: string, ttlSeconds: number): EventFreshnessStatus {
  const observedTime = new Date(observedAtIso).getTime();
  if (isNaN(observedTime)) return 'EXPIRED';

  const ageSeconds = Math.max(0, (Date.now() - observedTime) / 1000);
  if (ageSeconds <= ttlSeconds) {
    return 'FRESH';
  } else if (ageSeconds <= ttlSeconds * 3) {
    return 'STALE';
  } else {
    return 'EXPIRED';
  }
}

// -----------------------------------------------------------------------------
// Data Source Registry Operations
// -----------------------------------------------------------------------------
export async function listDataSources(filter?: {
  isActive?: boolean;
  providerType?: string;
  state?: string;
}): Promise<DataSource[]> {
  let sources = Array.from(localDataSources.values());

  if (filter) {
    if (filter.isActive !== undefined) {
      sources = sources.filter((s) => s.isActive === filter.isActive);
    }
    if (filter.providerType) {
      sources = sources.filter((s) => s.providerType === filter.providerType);
    }
    if (filter.state) {
      sources = sources.filter((s) => s.state === filter.state || s.state === 'ALL_NER');
    }
  }

  return sources.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getDataSourceById(id: string): Promise<DataSource> {
  const source = localDataSources.get(id);
  if (!source) {
    throw new NotFoundError(`Data source with ID ${id} not found`);
  }
  return source;
}

export async function getDataSourceByCode(code: string): Promise<DataSource> {
  const normalized = code.trim().toUpperCase();
  const source = Array.from(localDataSources.values()).find((s) => s.code === normalized);
  if (!source) {
    throw new NotFoundError(`Data source with code ${code} not found`);
  }
  return source;
}

export async function registerDataSource(
  input: unknown,
  user: SessionUser
): Promise<DataSource> {
  const parsed = createDataSourceSchema.parse(input);

  // Check unique code
  const existing = Array.from(localDataSources.values()).find((s) => s.code === parsed.code);
  if (existing) {
    throw new BadRequestError(`Data source with code ${parsed.code} already exists`);
  }

  const now = new Date().toISOString();
  const id = `src-${parsed.code.toLowerCase().replace(/_/g, '-')}-${Date.now().toString(36)}`;

  const newSource: DataSource = {
    id,
    code: parsed.code,
    name: parsed.name,
    providerType: parsed.provider_type,
    endpointUrl: parsed.endpoint_url || null,
    fetchIntervalSeconds: parsed.fetch_interval_seconds,
    state: parsed.state,
    isActive: parsed.is_active,
    freshnessTtlSeconds: parsed.freshness_ttl_seconds,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    createdAt: now,
    updatedAt: now,
  };

  localDataSources.set(id, newSource);

  await logAuditEvent({
    action: 'DATA_SOURCE_REGISTERED',
    userId: user.id,
    entityType: 'data_sources',
    entityId: id,
    metadata: {
      code: newSource.code,
      name: newSource.name,
      providerType: newSource.providerType,
      state: newSource.state,
    },
  });

  return newSource;
}

export async function updateDataSource(
  id: string,
  input: unknown,
  user: SessionUser
): Promise<DataSource> {
  const source = await getDataSourceById(id);
  const parsed = updateDataSourceSchema.parse(input);

  const updated: DataSource = {
    ...source,
    name: parsed.name ?? source.name,
    providerType: parsed.provider_type ?? source.providerType,
    endpointUrl: parsed.endpoint_url !== undefined ? parsed.endpoint_url : source.endpointUrl,
    fetchIntervalSeconds: parsed.fetch_interval_seconds ?? source.fetchIntervalSeconds,
    state: parsed.state ?? source.state,
    isActive: parsed.is_active !== undefined ? parsed.is_active : source.isActive,
    freshnessTtlSeconds: parsed.freshness_ttl_seconds ?? source.freshnessTtlSeconds,
    updatedAt: new Date().toISOString(),
  };

  localDataSources.set(id, updated);

  await logAuditEvent({
    action: 'DATA_SOURCE_UPDATED',
    userId: user.id,
    entityType: 'data_sources',
    entityId: id,
    metadata: {
      code: updated.code,
      changes: parsed,
    },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Ingestion Execution Engine
// -----------------------------------------------------------------------------
export interface ExecuteIngestionOptions {
  triggerMode?: IngestionTriggerMode;
  triggeredBy?: string;
  dryRun?: boolean;
  force?: boolean;
  customPayload?: unknown;
}

export async function executeIngestionRun(
  dataSourceIdOrCode: string,
  options?: ExecuteIngestionOptions
): Promise<IngestionExecutionResult> {
  let source: DataSource;
  try {
    source = await getDataSourceById(dataSourceIdOrCode);
  } catch {
    source = await getDataSourceByCode(dataSourceIdOrCode);
  }

  if (!source.isActive && !options?.force) {
    throw new BadRequestError(`Data source ${source.code} is currently inactive. Pass force=true to override.`);
  }

  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  const triggerMode = options?.triggerMode || 'MANUAL';
  const triggeredBy = options?.triggeredBy || null;

  // Initialize Run
  const runRecord: DataIngestionRun = {
    id: runId,
    dataSourceId: source.id,
    dataSourceCode: source.code,
    status: 'RUNNING',
    triggerMode,
    triggeredBy,
    recordsIngested: 0,
    recordsRejected: 0,
    recordsSkippedDuplicate: 0,
    durationMs: 0,
    errorLog: null,
    metadata: {},
    startedAt,
    completedAt: null,
    createdAt: startedAt,
  };

  localIngestionRuns.set(runId, runRecord);

  await logAuditEvent({
    action: 'DATA_INGESTION_STARTED',
    userId: triggeredBy,
    entityType: 'data_ingestion_runs',
    entityId: runId,
    metadata: {
      dataSourceCode: source.code,
      triggerMode,
    },
  });

  const errors: string[] = [];
  const weatherResults: WeatherEvent[] = [];
  const roadResults: RoadEvent[] = [];
  const accessibilityResults: AccessibilityEvent[] = [];

  try {
    let rawPayload = options?.customPayload;

    // If no custom payload provided, fetch from external endpoint with retries (or empty array if dryRun)
    if (rawPayload === undefined) {
      if (options?.dryRun) {
        rawPayload = [];
      } else {
        if (!source.endpointUrl) {
          throw new BadRequestError(`No endpoint URL configured for data source ${source.code}`);
        }
        rawPayload = await fetchExternalFeedWithRetry(source.endpointUrl);
      }
    }

    if (!Array.isArray(rawPayload)) {
      rawPayload = [rawPayload];
    }

    // Process each record according to source type
    for (let index = 0; index < (rawPayload as unknown[]).length; index++) {
      const rawItem = (rawPayload as unknown[])[index];

      try {
        if (source.code === 'IMD_AWS' || source.providerType === 'REST_API') {
          const processed = processWeatherRecord(source, rawItem, runId, options?.dryRun);
          if (processed.isDuplicate) {
            runRecord.recordsSkippedDuplicate++;
          } else if (processed.event) {
            weatherResults.push(processed.event);
            runRecord.recordsIngested++;
          }
        } else if (source.code === 'BRO_ROAD_BULLETINS' || source.providerType === 'GOV_BULLETIN') {
          const processed = processRoadEventRecord(source, rawItem, runId, options?.dryRun);
          if (processed.isDuplicate) {
            runRecord.recordsSkippedDuplicate++;
          } else if (processed.event) {
            roadResults.push(processed.event);
            runRecord.recordsIngested++;
          }
        } else if (source.code === 'SDMA_DISASTER_PORTAL' || source.providerType === 'DISASTER_ALERT') {
          const processed = processAccessibilityRecord(source, rawItem, runId, options?.dryRun);
          if (processed.isDuplicate) {
            runRecord.recordsSkippedDuplicate++;
          } else if (processed.event) {
            accessibilityResults.push(processed.event);
            runRecord.recordsIngested++;
          }
        } else {
          // Generic fallback handler for weather/road attributes
          if (typeof rawItem === 'object' && rawItem !== null && 'highway_code' in rawItem) {
            const processed = processRoadEventRecord(source, rawItem, runId, options?.dryRun);
            if (processed.isDuplicate) runRecord.recordsSkippedDuplicate++;
            else if (processed.event) {
              roadResults.push(processed.event);
              runRecord.recordsIngested++;
            }
          } else {
            const processed = processWeatherRecord(source, rawItem, runId, options?.dryRun);
            if (processed.isDuplicate) runRecord.recordsSkippedDuplicate++;
            else if (processed.event) {
              weatherResults.push(processed.event);
              runRecord.recordsIngested++;
            }
          }
        }
      } catch (validationErr: unknown) {
        runRecord.recordsRejected++;
        const msg = validationErr instanceof Error ? validationErr.message : String(validationErr);
        errors.push(`Record #${index}: ${msg}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    let finalStatus: IngestionStatus = 'SUCCESS';
    if (runRecord.recordsRejected > 0 && runRecord.recordsIngested > 0) {
      finalStatus = 'PARTIAL';
    } else if (runRecord.recordsRejected > 0 && runRecord.recordsIngested === 0 && runRecord.recordsSkippedDuplicate === 0) {
      finalStatus = 'FAILED';
    }

    runRecord.status = finalStatus;
    runRecord.durationMs = durationMs;
    runRecord.completedAt = completedAt;
    runRecord.errorLog = errors.length > 0 ? errors.join('\n') : null;

    // Update Source Health
    source.lastSuccessAt = completedAt;
    source.consecutiveFailures = 0;
    source.updatedAt = completedAt;
    localDataSources.set(source.id, source);

    await logAuditEvent({
      action: 'DATA_INGESTION_COMPLETED',
      userId: triggeredBy,
      entityType: 'data_ingestion_runs',
      entityId: runId,
      metadata: {
        dataSourceCode: source.code,
        status: finalStatus,
        ingested: runRecord.recordsIngested,
        rejected: runRecord.recordsRejected,
        skippedDuplicate: runRecord.recordsSkippedDuplicate,
        durationMs,
      },
    });

    return {
      run: runRecord,
      weatherEvents: weatherResults,
      roadEvents: roadResults,
      accessibilityEvents: accessibilityResults,
    };
  } catch (runErr: unknown) {
    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();
    const errorMsg = runErr instanceof Error ? runErr.message : String(runErr);

    runRecord.status = 'FAILED';
    runRecord.durationMs = durationMs;
    runRecord.completedAt = completedAt;
    runRecord.errorLog = errorMsg;

    // Update Source Failures
    source.lastFailureAt = completedAt;
    source.consecutiveFailures = (source.consecutiveFailures || 0) + 1;
    source.updatedAt = completedAt;
    localDataSources.set(source.id, source);

    await logAuditEvent({
      action: 'DATA_INGESTION_FAILED',
      userId: triggeredBy,
      entityType: 'data_ingestion_runs',
      entityId: runId,
      metadata: {
        dataSourceCode: source.code,
        error: errorMsg,
        consecutiveFailures: source.consecutiveFailures,
        durationMs,
      },
    });

    return {
      run: runRecord,
    };
  }
}

// -----------------------------------------------------------------------------
// Record Processing & Validation Handlers
// -----------------------------------------------------------------------------
function processWeatherRecord(
  source: DataSource,
  rawItem: unknown,
  runId: string,
  dryRun?: boolean
): { event?: WeatherEvent; isDuplicate: boolean } {
  const parsed = externalWeatherRecordSchema.parse(rawItem);

  // Validate geofence
  if (!isWithinNerBounds(parsed.latitude, parsed.longitude)) {
    throw new BadRequestError(
      `Weather station ${parsed.station_name} coordinates [${parsed.latitude}, ${parsed.longitude}] are outside Northeast India boundaries`
    );
  }

  // Validate temporal sanity: reject future timestamps > 10m
  const obsDate = new Date(parsed.observed_at);
  if (isNaN(obsDate.getTime())) {
    throw new BadRequestError(`Invalid observed_at timestamp: ${parsed.observed_at}`);
  }
  if (obsDate.getTime() > Date.now() + 10 * 60 * 1000) {
    throw new BadRequestError(`Observation timestamp cannot be more than 10 minutes in the future: ${parsed.observed_at}`);
  }

  // Compute deterministic payload hash for deduplication
  const recordIdentity = {
    source: source.code,
    stationCode: parsed.station_code,
    observedAt: parsed.observed_at,
    temp: parsed.temperature_c,
    rain: parsed.rainfall_mm_1h,
  };
  const payloadHash = computePayloadHash(recordIdentity);

  if (ingestedPayloadHashes.has(payloadHash)) {
    return { isDuplicate: true };
  }

  const now = new Date().toISOString();
  const eventId = `wea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const freshness = calculateEventFreshness(parsed.observed_at, source.freshnessTtlSeconds);

  const event: WeatherEvent = {
    id: eventId,
    dataSourceId: source.id,
    sourceRecordId: parsed.source_record_id || parsed.station_code,
    stationName: parsed.station_name,
    stationCode: parsed.station_code,
    state: parsed.state,
    coordinates: {
      lat: parsed.latitude,
      lng: parsed.longitude,
    },
    temperatureC: parsed.temperature_c,
    rainfallMm1h: parsed.rainfall_mm_1h,
    rainfallMm24h: parsed.rainfall_mm_24h,
    windSpeedKmh: parsed.wind_speed_kmh,
    visibilityKm: parsed.visibility_km,
    conditionCode: parsed.condition_code as WeatherConditionCode,
    isSevereWarning: parsed.is_severe_warning,
    observedAt: parsed.observed_at,
    ingestedAt: now,
    freshness,
    provenance: {
      sourceCode: source.code,
      sourceName: source.name,
      sourceRecordId: parsed.source_record_id || parsed.station_code,
      ingestionRunId: runId,
      rawPayloadHash: payloadHash,
      ingestedAt: now,
    },
  };

  if (!dryRun) {
    ingestedPayloadHashes.add(payloadHash);
    localWeatherEvents.set(eventId, event);
  }

  return { event, isDuplicate: false };
}

function processRoadEventRecord(
  source: DataSource,
  rawItem: unknown,
  runId: string,
  dryRun?: boolean
): { event?: RoadEvent; isDuplicate: boolean } {
  const parsed = externalRoadEventRecordSchema.parse(rawItem);

  if (!isWithinNerBounds(parsed.latitude, parsed.longitude)) {
    throw new BadRequestError(
      `Highway obstruction on ${parsed.highway_code} at [${parsed.latitude}, ${parsed.longitude}] is outside Northeast India boundaries`
    );
  }

  const repDate = new Date(parsed.reported_at);
  if (isNaN(repDate.getTime())) {
    throw new BadRequestError(`Invalid reported_at timestamp: ${parsed.reported_at}`);
  }
  if (repDate.getTime() > Date.now() + 10 * 60 * 1000) {
    throw new BadRequestError(`Reported timestamp cannot be in the future: ${parsed.reported_at}`);
  }

  const recordIdentity = {
    source: source.code,
    highway: parsed.highway_code,
    sector: parsed.sector_name,
    blockage: parsed.blockage_type,
    reportedAt: parsed.reported_at,
  };
  const payloadHash = computePayloadHash(recordIdentity);

  if (ingestedPayloadHashes.has(payloadHash)) {
    return { isDuplicate: true };
  }

  const now = new Date().toISOString();
  const eventId = `road-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const freshness = calculateEventFreshness(parsed.reported_at, source.freshnessTtlSeconds);

  const event: RoadEvent = {
    id: eventId,
    dataSourceId: source.id,
    sourceRecordId: parsed.source_record_id || `${parsed.highway_code}-${parsed.sector_name}`,
    highwayCode: parsed.highway_code,
    sectorName: parsed.sector_name,
    state: parsed.state,
    coordinates: {
      lat: parsed.latitude,
      lng: parsed.longitude,
    },
    blockageType: parsed.blockage_type as RoadBlockageType,
    reason: parsed.reason as RoadDisruptionReason,
    clearanceEta: parsed.clearance_eta || null,
    isImpassable: parsed.is_impassable,
    reportedAt: parsed.reported_at,
    ingestedAt: now,
    verifiedByBro: parsed.verified_by_bro,
    freshness,
    provenance: {
      sourceCode: source.code,
      sourceName: source.name,
      sourceRecordId: parsed.source_record_id || `${parsed.highway_code}-${parsed.sector_name}`,
      ingestionRunId: runId,
      rawPayloadHash: payloadHash,
      ingestedAt: now,
    },
  };

  if (!dryRun) {
    ingestedPayloadHashes.add(payloadHash);
    localRoadEvents.set(eventId, event);
  }

  return { event, isDuplicate: false };
}

function processAccessibilityRecord(
  source: DataSource,
  rawItem: unknown,
  runId: string,
  dryRun?: boolean
): { event?: AccessibilityEvent; isDuplicate: boolean } {
  const parsed = externalAccessibilityRecordSchema.parse(rawItem);

  if (!isWithinNerBounds(parsed.latitude, parsed.longitude)) {
    throw new BadRequestError(
      `Accessibility declaration for ${parsed.settlement_name} at [${parsed.latitude}, ${parsed.longitude}] is outside Northeast India boundaries`
    );
  }

  const effDate = new Date(parsed.effective_from);
  if (isNaN(effDate.getTime())) {
    throw new BadRequestError(`Invalid effective_from timestamp: ${parsed.effective_from}`);
  }

  const recordIdentity = {
    source: source.code,
    settlement: parsed.settlement_name,
    district: parsed.district,
    newTier: parsed.new_tier,
    effectiveFrom: parsed.effective_from,
  };
  const payloadHash = computePayloadHash(recordIdentity);

  if (ingestedPayloadHashes.has(payloadHash)) {
    return { isDuplicate: true };
  }

  const now = new Date().toISOString();
  const eventId = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const freshness = calculateEventFreshness(parsed.effective_from, source.freshnessTtlSeconds);

  const event: AccessibilityEvent = {
    id: eventId,
    dataSourceId: source.id,
    sourceRecordId: parsed.source_record_id || `${parsed.district}-${parsed.settlement_name}`,
    locationId: `loc-${parsed.settlement_name.toLowerCase().replace(/\s+/g, '-')}`,
    settlementName: parsed.settlement_name,
    district: parsed.district,
    state: parsed.state,
    coordinates: {
      lat: parsed.latitude,
      lng: parsed.longitude,
    },
    previousTier: parsed.previous_tier as AccessibilityTier,
    newTier: parsed.new_tier as AccessibilityTier,
    reason: parsed.reason,
    declaredBy: parsed.declared_by,
    effectiveFrom: parsed.effective_from,
    estimatedRestoration: parsed.estimated_restoration || null,
    isActive: parsed.is_active,
    ingestedAt: now,
    freshness,
    provenance: {
      sourceCode: source.code,
      sourceName: source.name,
      sourceRecordId: parsed.source_record_id || `${parsed.district}-${parsed.settlement_name}`,
      ingestionRunId: runId,
      rawPayloadHash: payloadHash,
      ingestedAt: now,
    },
  };

  if (!dryRun) {
    ingestedPayloadHashes.add(payloadHash);
    localAccessibilityEvents.set(eventId, event);
  }

  return { event, isDuplicate: false };
}

// -----------------------------------------------------------------------------
// Resilient External Fetcher with Exponential Backoff
// -----------------------------------------------------------------------------
async function fetchExternalFeedWithRetry(
  url: string,
  maxRetries = 3,
  initialDelayMs = 500
): Promise<unknown> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      if (res.status >= 400 && res.status < 500) {
        throw new BadRequestError(`Upstream authoritative source returned HTTP ${res.status}`);
      }

      // 5xx error: retry
      attempt++;
    } catch (err: unknown) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Failed to fetch external data source after ${maxRetries} attempts: ${err instanceof Error ? err.message : String(err)}`);
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  throw new Error(`Upstream feed unreachable at ${url}`);
}

// -----------------------------------------------------------------------------
// Ingestion Runs History & Event Queries
// -----------------------------------------------------------------------------
export async function listIngestionRuns(filter?: {
  dataSourceId?: string;
  dataSourceCode?: string;
  status?: IngestionStatus;
  limit?: number;
  offset?: number;
}): Promise<{ runs: DataIngestionRun[]; total: number }> {
  let runs = Array.from(localIngestionRuns.values());

  if (filter) {
    if (filter.dataSourceId) {
      runs = runs.filter((r) => r.dataSourceId === filter.dataSourceId);
    }
    if (filter.dataSourceCode) {
      runs = runs.filter((r) => r.dataSourceCode === filter.dataSourceCode);
    }
    if (filter.status) {
      runs = runs.filter((r) => r.status === filter.status);
    }
  }

  // Sort descending by startedAt
  runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const total = runs.length;
  const offset = filter?.offset || 0;
  const limit = filter?.limit || 50;
  const paginated = runs.slice(offset, offset + limit);

  return { runs: paginated, total };
}

export async function queryIngestedEvents(queryInput: unknown): Promise<{
  weather: WeatherEvent[];
  road: RoadEvent[];
  accessibility: AccessibilityEvent[];
  total: number;
}> {
  const parsed = ingestionEventQuerySchema.parse(queryInput);

  let weather = Array.from(localWeatherEvents.values());
  let road = Array.from(localRoadEvents.values());
  let accessibility = Array.from(localAccessibilityEvents.values());

  // Filter Weather
  if (parsed.event_type === 'weather' || parsed.event_type === 'all') {
    if (parsed.state) weather = weather.filter((w) => w.state.toLowerCase() === parsed.state?.toLowerCase());
    if (parsed.is_severe !== undefined) weather = weather.filter((w) => w.isSevereWarning === parsed.is_severe);
    if (parsed.freshness) {
      weather = weather.filter((w) => {
        const source = localDataSources.get(w.dataSourceId);
        const ttl = source?.freshnessTtlSeconds || 3600;
        return calculateEventFreshness(w.observedAt, ttl) === parsed.freshness;
      });
    }
  } else {
    weather = [];
  }

  // Filter Road
  if (parsed.event_type === 'road' || parsed.event_type === 'all') {
    if (parsed.state) road = road.filter((r) => r.state.toLowerCase() === parsed.state?.toLowerCase());
    if (parsed.highway_code) road = road.filter((r) => r.highwayCode.toLowerCase() === parsed.highway_code?.toLowerCase());
    if (parsed.is_severe !== undefined) road = road.filter((r) => r.isImpassable === parsed.is_severe);
    if (parsed.freshness) {
      road = road.filter((r) => {
        const source = localDataSources.get(r.dataSourceId);
        const ttl = source?.freshnessTtlSeconds || 14400;
        return calculateEventFreshness(r.reportedAt, ttl) === parsed.freshness;
      });
    }
  } else {
    road = [];
  }

  // Filter Accessibility
  if (parsed.event_type === 'accessibility' || parsed.event_type === 'all') {
    if (parsed.state) accessibility = accessibility.filter((a) => a.state.toLowerCase() === parsed.state?.toLowerCase());
    if (parsed.is_severe !== undefined) accessibility = accessibility.filter((a) => a.newTier === 'ISOLATED');
    if (parsed.freshness) {
      accessibility = accessibility.filter((a) => {
        const source = localDataSources.get(a.dataSourceId);
        const ttl = source?.freshnessTtlSeconds || 21600;
        return calculateEventFreshness(a.effectiveFrom, ttl) === parsed.freshness;
      });
    }
  } else {
    accessibility = [];
  }

  // Recalculate dynamic freshness on returned events
  weather = weather.map((w) => {
    const src = localDataSources.get(w.dataSourceId);
    return { ...w, freshness: calculateEventFreshness(w.observedAt, src?.freshnessTtlSeconds || 3600) };
  });

  road = road.map((r) => {
    const src = localDataSources.get(r.dataSourceId);
    return { ...r, freshness: calculateEventFreshness(r.reportedAt, src?.freshnessTtlSeconds || 14400) };
  });

  accessibility = accessibility.map((a) => {
    const src = localDataSources.get(a.dataSourceId);
    return { ...a, freshness: calculateEventFreshness(a.effectiveFrom, src?.freshnessTtlSeconds || 21600) };
  });

  const total = weather.length + road.length + accessibility.length;

  return {
    weather: weather.slice(parsed.offset, parsed.offset + parsed.limit),
    road: road.slice(parsed.offset, parsed.offset + parsed.limit),
    accessibility: accessibility.slice(parsed.offset, parsed.offset + parsed.limit),
    total,
  };
}

// -----------------------------------------------------------------------------
// Testing Store Reset Helper
// -----------------------------------------------------------------------------
export function _resetIngestionStore(): void {
  localDataSources.clear();
  localIngestionRuns.clear();
  localWeatherEvents.clear();
  localRoadEvents.clear();
  localAccessibilityEvents.clear();
  ingestedPayloadHashes.clear();
  seedDefaultDataSources();
}
