/**
 * AuraNER / NER-Route AI — Production Analytics Domain Types
 * 
 * Defines enterprise contracts for logistics analytics, corridor reliability,
 * chokepoints, fleet efficiency, driver compliance, time trends, and exports.
 */

export type DateRangePreset = '7D' | '30D' | '90D' | 'CUSTOM';

export type AggregationInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type ExportFormat = 'CSV' | 'JSON' | 'PDF_BRIEF';

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  preset?: DateRangePreset;
  interval?: AggregationInterval;
  corridorId?: string;
  fleetType?: string;
  state?: string;
  organizationId?: string;
}

export interface CorridorReliabilityMetric {
  corridorId: string;
  corridorName: string;
  totalTrips: number;
  completedTrips: number;
  delayedTrips: number;
  cancelledTrips: number;
  avgPlannedDurationMinutes: number;
  avgActualDurationMinutes: number;
  varianceMinutes: number;
  onTimeRatePct: number;
  disruptionCount: number;
  reliabilityScore: number; // 0 - 100
}

export interface ChokepointFrequencyMetric {
  sectorName: string;
  highwayCode: string;
  state: string;
  disruptionCount: number;
  avgClosureDurationHours: number;
  lastIncidentAt?: string;
}

export interface FleetEfficiencyMetric {
  vehicleType: string;
  activeVehicles: number;
  totalDistanceKm: number;
  avgPayloadUtilizationPct: number;
  estimatedFuelUsedLiters: number;
  fuelEfficiencyKmPerLiter: number;
  steepGradientTripCount: number;
}

export interface DriverSafetyComplianceMetric {
  totalActiveDrivers: number;
  avgSafetyScore: number;
  incidentCount: number;
  mountainCertifiedPct: number;
  dutyHoursExceededCount: number;
}

export interface TimeTrendBucket {
  periodStart: string;
  periodEnd: string;
  label: string;
  totalTrips: number;
  completedDeliveries: number;
  delays: number;
  emergencyDisruptions: number;
  avgTransitDurationMinutes: number;
  cargoWeightTons: number;
}

export interface AnalyticsSummaryReport {
  organizationId: string;
  isCrossTenant: boolean;
  dateRange: {
    start: string;
    end: string;
    preset?: DateRangePreset;
  };
  interval: AggregationInterval;
  dataFreshness: 'LIVE' | 'STALE';
  asOfTimestamp: string;
  provenanceHash: string;
  hasSufficientData: boolean;
  insufficientDataReason?: string;
  kpis: {
    totalTrips: number;
    completedDeliveries: number;
    onTimeDeliveryRatePct: number | null;
    avgTransitDelayMinutes: number | null;
    fleetUtilizationPct: number | null;
    disruptionEventCount: number;
    cargoMovedKg: number;
    activeCorridorsCount: number;
  };
  corridorReliability: CorridorReliabilityMetric[];
  chokepoints: ChokepointFrequencyMetric[];
  fleetEfficiency: FleetEfficiencyMetric[];
  driverCompliance: DriverSafetyComplianceMetric;
  trends: TimeTrendBucket[];
}

export interface AnalyticsExportParams extends AnalyticsQueryParams {
  format?: ExportFormat;
}
