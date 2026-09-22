// =============================================================================
// AuraNER / NER-RouteAI — Provider Abstractions & Interfaces
// Decouples business engines from external APIs (OSRM, Nominatim, Open-Meteo)
// =============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingLocation {
  id: string;
  name: string;
  state: string;
  district?: string;
  type: string; // city, town, village, warehouse, hospital, relief_hub
  lat: number;
  lng: number;
  elevationMeters: number;
  population?: number;
  accessibilityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED';
  roadAccessQuality: 'ALL_WEATHER' | 'FAIR_WEATHER' | '4X4_ONLY' | 'RESTRICTED';
}

export interface GeocodingProvider {
  search(query: string, options?: { state?: string; limit?: number }): Promise<GeocodingLocation[]>;
  reverse(lat: number, lng: number): Promise<GeocodingLocation | null>;
}

export interface RouteSegmentDetail {
  segmentOrder: number;
  name: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  distanceKm: number;
  durationMinutes: number;
  terrain: 'PLAIN' | 'HILLY' | 'MOUNTAINOUS';
  roadConditionScore: number;
  elevationMeters?: number;
  highwayCode?: string;
  gradientSlopePercent?: number;
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [longitude, latitude] for GeoJSON/MapLibre
  distanceKm: number;
  durationMinutes: number;
  elevationGainMeters: number;
  segments: RouteSegmentDetail[];
  providerName: string;
}

export interface RoutingProvider {
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: {
      avoidCoordinates?: Coordinates[];
      vehicleType?: string;
      maxGradientPct?: number;
    }
  ): Promise<RouteCalculationResult>;
}

export interface WeatherObservation {
  lat: number;
  lng: number;
  temperatureC: number;
  rainfallMm1h: number;
  rainfallMm24h: number;
  windSpeedKmh: number;
  visibilityKm: number;
  condition: string; // Clear, Rainy, Fog, Heavy Rain, Storm
  isSevereWarning: boolean;
  timestamp: string;
}

export interface WeatherProvider {
  getWeather(lat: number, lng: number): Promise<WeatherObservation>;
  getWeatherAlongRoute(points: Coordinates[]): Promise<WeatherObservation[]>;
}

export interface TelemetryUpdate {
  vehicleId: string;
  shipmentId: string;
  coordinates: Coordinates;
  speedKmh: number;
  headingDegrees: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  timestamp: string;
}

export interface TelemetryProvider {
  emitTelemetry(update: TelemetryUpdate): Promise<void>;
  getLatestTelemetry(vehicleId: string): Promise<TelemetryUpdate | null>;
}

export interface NotificationPayload {
  recipient: string;
  channel: 'IN_APP' | 'SMS' | 'EMAIL' | 'PUSH' | 'LOG';
  title: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
