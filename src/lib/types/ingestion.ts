/**
 * AuraNER / NER-Route AI — Phase 14: NER Data Ingestion Architecture Domain Types
 * 
 * Defines the core models for authoritative external data sources, periodic and
 * on-demand ingestion runs, validation/normalization contracts, cryptographic
 * provenance tracking, and standardized NER intelligence events.
 */

export type DataSourceProviderType =
  | 'REST_API'
  | 'GOV_BULLETIN'
  | 'HYDRO_GAUGE'
  | 'DISASTER_ALERT'
  | 'GEOJSON_FEED'
  | 'MANUAL_ENTRY';

export type DataSourceStateScope =
  | 'ASSAM'
  | 'MEGHALAYA'
  | 'NAGALAND'
  | 'MANIPUR'
  | 'TRIPURA'
  | 'MIZORAM'
  | 'ARUNACHAL_PRADESH'
  | 'SIKKIM'
  | 'ALL_NER';

export interface DataSource {
  id: string;
  code: string; // e.g. 'IMD_AWS', 'BRO_ROAD_BULLETINS', 'CWC_FLOOD_GAUGE', 'SDMA_DISASTER_PORTAL'
  name: string;
  providerType: DataSourceProviderType;
  endpointUrl: string | null;
  fetchIntervalSeconds: number;
  state: DataSourceStateScope;
  isActive: boolean;
  freshnessTtlSeconds: number;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type IngestionStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type IngestionTriggerMode = 'SCHEDULED' | 'MANUAL' | 'WEBHOOK';

export interface DataIngestionRun {
  id: string;
  dataSourceId: string;
  dataSourceCode: string;
  status: IngestionStatus;
  triggerMode: IngestionTriggerMode;
  triggeredBy: string | null;
  recordsIngested: number;
  recordsRejected: number;
  recordsSkippedDuplicate: number;
  durationMs: number;
  errorLog: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export type EventFreshnessStatus = 'FRESH' | 'STALE' | 'EXPIRED';

export interface EventProvenance {
  sourceCode: string;
  sourceName: string;
  sourceRecordId: string;
  ingestionRunId: string;
  rawPayloadHash: string;
  ingestedAt: string;
}

export type WeatherConditionCode =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'FOG'
  | 'CLOUDBURST'
  | 'THUNDERSTORM'
  | 'CYCLONE';

export interface WeatherEvent {
  id: string;
  dataSourceId: string;
  sourceRecordId: string;
  stationName: string;
  stationCode: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  temperatureC: number;
  rainfallMm1h: number;
  rainfallMm24h: number;
  windSpeedKmh: number;
  visibilityKm: number;
  conditionCode: WeatherConditionCode;
  isSevereWarning: boolean;
  observedAt: string;
  ingestedAt: string;
  freshness: EventFreshnessStatus;
  provenance: EventProvenance;
}

export type RoadBlockageType =
  | 'BOTH_LANES_BLOCKED'
  | 'SINGLE_LANE_OPEN'
  | 'TEMPORARY_DIVERSION'
  | 'BRIDGE_UNSAFE'
  | 'SURFACE_EROSION';

export type RoadDisruptionReason =
  | 'LANDSLIDE'
  | 'ROCKFALL'
  | 'WATERLOGGING'
  | 'BRIDGE_COLLAPSE'
  | 'ROAD_SUBSIDENCE'
  | 'SECURITY_RESTRICTION';

export interface RoadEvent {
  id: string;
  dataSourceId: string;
  sourceRecordId: string;
  highwayCode: string; // e.g. 'NH-29', 'NH-6', 'NH-2', 'NH-10'
  sectorName: string;  // e.g. 'Zubza Pass', 'Piphema', 'Sonapur Tunnel'
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  blockageType: RoadBlockageType;
  reason: RoadDisruptionReason;
  clearanceEta: string | null;
  isImpassable: boolean;
  reportedAt: string;
  ingestedAt: string;
  verifiedByBro: boolean;
  freshness: EventFreshnessStatus;
  provenance: EventProvenance;
}

export type AccessibilityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED';

export interface AccessibilityEvent {
  id: string;
  dataSourceId: string;
  sourceRecordId: string;
  locationId: string;
  settlementName: string;
  district: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  previousTier: AccessibilityTier;
  newTier: AccessibilityTier;
  reason: string;
  declaredBy: string; // e.g. 'ASDMA', 'NDRF', 'BRO', 'DISTRICT_COLLECTOR'
  effectiveFrom: string;
  estimatedRestoration: string | null;
  isActive: boolean;
  ingestedAt: string;
  freshness: EventFreshnessStatus;
  provenance: EventProvenance;
}

export interface IngestionExecutionResult {
  run: DataIngestionRun;
  weatherEvents?: WeatherEvent[];
  roadEvents?: RoadEvent[];
  accessibilityEvents?: AccessibilityEvent[];
}
