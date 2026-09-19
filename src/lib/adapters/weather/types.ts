// =============================================================================
// AuraNER / NER-RouteAI — Hyperlocal Weather Intelligence Contracts
// =============================================================================

import { Coordinates } from '@/lib/providers/types';

export type NWPModelSource =
  | 'TOMORROW_IO_ROUTES'
  | 'OPENWEATHER_ONECALL_3'
  | 'OPEN_METEO_HRRR_3KM'
  | 'OPEN_METEO_ICON_7KM'
  | 'OPEN_METEO_GFS_13KM'
  | 'REGIONAL_NWP_REANALYSIS';

export type WeatherFreshnessStatus = 'VERIFIED_FRESH' | 'UNVERIFIED_STALE';

export interface RouteWeatherMetrics {
  lat: number;
  lng: number;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  precipitationIntensityMmH: number; // minute-by-minute precipitation intensity
  precipitationProbabilityPct: number;
  atmosphericVisibilityKm: number;
  surfaceWindSpeedKmh: number;
  surfaceWindGustKmh: number; // surface wind shear gusts
  windDirectionDegrees: number;
  roadFreezingRisk: boolean; // road freezing risk flag
  roadFreezingProbability: number; // 0.0 to 1.0
  hydroplaningRiskIndex: number; // 0.0 to 1.0
  conditionText: string;
  isSevereWarning: boolean;
  severeAlerts: Array<{
    event: string;
    headline: string;
    severity: 'WARNING' | 'WATCH' | 'ADVISORY';
    effective: string;
    expires: string;
  }>;
  nwpModelSource: NWPModelSource;
  dataFreshness: WeatherFreshnessStatus;
  dataAgeSeconds: number;
  timestamp: string;
}

export interface IWeatherAdapter {
  name: string;
  getWeather(lat: number, lng: number): Promise<RouteWeatherMetrics>;
  getWeatherAlongRoute(points: Coordinates[]): Promise<RouteWeatherMetrics[]>;
  checkFreshness(timestampStr: string): {
    isStale: boolean;
    status: WeatherFreshnessStatus;
    ageSeconds: number;
  };
}
