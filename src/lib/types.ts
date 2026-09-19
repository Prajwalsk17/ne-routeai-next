// ============================================
// NER-RouteAI — Core Type Definitions
// All TypeScript interfaces for the platform
// ============================================

// --- Geographic ---
export interface Location {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: 'city' | 'town' | 'village';
  population: number;
  elevation: number;
}

// --- Logistics ---
export interface Vehicle {
  id: string;
  type: 'TRUCK' | 'VAN' | 'HELICOPTER' | 'BOAT' | 'AMBULANCE_TRUCK';
  capacityTons: number;
  state: string;
  currentLocation: string;
  lat: number;
  lng: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'STANDBY' | 'MAINTENANCE';
  driver: string;
  fuelPct: number;
  riskTolerance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Warehouse {
  id: string;
  name: string;
  locationId: string;
  lat: number;
  lng: number;
  state: string;
  capacityTons: number;
  currentLoadPct: number;
  inventoryLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  accessibilityScore: number;
  status: 'OPERATIONAL' | 'NEAR_CAPACITY' | 'ELEVATED_RISK';
}

export interface Hospital {
  id: string;
  name: string;
  locationId: string;
  lat: number;
  lng: number;
  state: string;
  beds: number;
  emergency: boolean;
  type: 'MAJOR' | 'APEX' | 'DISTRICT' | 'CHC' | 'PHC';
}

export interface RoadSegment {
  id: string;
  name: string;
  fromLoc: string;
  toLoc: string;
  distanceKm: number;
  baseTimeHr: number;
  roadCondition: number;
  riskScore: number;
  weatherScore: number;
  costPerKm: number;
  accessibility: number;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  terrain: 'PLAIN' | 'HILLY' | 'MOUNTAINOUS' | 'MIXED';
}

export interface Delivery {
  id: string;
  originId: string;
  destinationId: string;
  vehicleId: string;
  cargoType: string;
  cargoWeightKg: number;
  priority: Priority;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | 'CANCELLED';
  progressPct: number;
  etaHours: number;
  risk: RiskLevel;
  // Enriched fields (populated by API)
  origin?: Location;
  destination?: Location;
  vehicle?: Vehicle;
}

// --- Risk ---
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskFactors {
  rainfall: number;
  terrain: number;
  historical: number;
  roadCondition: number;
  floodIndicator: number;
  overall: number;
  status: RiskLevel;
}

export interface RiskPrediction {
  location_id: string;
  current_status: string;
  landslide_probability: number;
  flood_probability: number;
  road_disruption_probability: number;
  overall_risk: number;
  risk_level: RiskLevel;
  factors: RiskFactors;
  prediction_horizon_hours: number;
  data_source: string;
}

export interface RiskRegion {
  location_id: string;
  name: string;
  state: string;
  overall_risk: number;
  status: RiskLevel;
}

// --- Accessibility ---
export type AccessibilityClassification = 'CRITICAL' | 'POOR' | 'MODERATE' | 'GOOD' | 'EXCELLENT';

export interface AccessibilityScores {
  road: number;
  transport: number;
  healthcare: number;
  emergency: number;
  digital: number;
  lastMile: number;
  overall: number;
  classification: AccessibilityClassification;
}

export interface AccessibilityResult {
  location_id: string;
  location_name: string;
  scores: AccessibilityScores;
  overall: number;
  classification: AccessibilityClassification;
  bottleneck: [string, number];
  gap_analysis?: {
    demand_score: number;
    accessibility_score: number;
    gap_score: number;
  };
  recommendations?: string[];
  data_source: string;
}

// --- Route ---
export interface RouteScoreBreakdown {
  roadCondition: number;
  weatherSafety: number;
  landslideSafety: number;
  floodSafety: number;
  travelTimeScore: number;
  costEfficiency: number;
  accessibility: number;
}

export interface RouteCandidate {
  id: string;
  rankLabel: string;
  name: string;
  distanceKm: number;
  travelTimeHr: number;
  travelTimeDisplay: string;
  roadCondition: number;
  riskScore: number;
  weatherRisk: number;
  landslidRisk: number;
  floodRisk: number;
  accessibility: number;
  costInr: number;
  via: string[];
  color: string;
  score: number;
  reliabilityPct: number;
  riskLabel: RiskLevel;
  warnings: string[];
  scoreBreakdown: RouteScoreBreakdown;
  explanation: string;
}

export interface RouteAnalysisResult {
  routes: RouteCandidate[];
  analysis_id: string;
  recommended_route: string;
}

export interface RouteAnalyzeParams {
  origin_id: string;
  destination_id: string;
  cargo_type: string;
  cargo_weight_kg: number;
  vehicle_type: string;
  priority: Priority;
}

// --- Emergency ---
export interface EmergencyMissionParams {
  mission_type: string;
  origin_id: string;
  destination_id: string;
  cargo_type: string;
  cargo_weight_kg: number;
  required_eta_hours?: number;
  priority: Priority;
}

export interface EmergencyResult {
  mission_priority_score: number;
  priority_level: string;
  routes: RouteCandidate[];
  recommended_vehicle: Vehicle;
  suitable_vehicles: Vehicle[];
  action_plan: string[];
  data_source: string;
}

// --- Simulation ---
export type ScenarioType =
  | 'HEAVY_RAINFALL'
  | 'HIGHWAY_CLOSURE'
  | 'LANDSLIDE'
  | 'FLOOD'
  | 'BRIDGE_FAILURE'
  | 'FUEL_SHORTAGE';

export interface SimulationParams {
  scenario_type: ScenarioType;
  severity: number; // 0.0 - 1.0
  duration_hours: number;
  location_id?: string;
}

export interface SimulationResult {
  scenario: ScenarioType;
  severity: number;
  affected_routes: number;
  affected_districts: number;
  vehicles_affected: number;
  emergency_deliveries: number;
  estimated_delay_hours: number;
  accessibility_impact: number;
  logistics_cost_multiplier: number;
  before: SimulationMetrics;
  after: SimulationMetrics;
  response_plan: string[];
  data_source: string;
}

export interface SimulationMetrics {
  avg_delivery_time: number;
  avg_risk: number;
  accessibility: number;
  vehicle_availability: number;
  completion_rate: number;
}

// --- Demand ---
export interface DemandForecastParams {
  location_id: string;
  period_days: number;
  season: 'MONSOON' | 'PRE_MONSOON' | 'WINTER' | 'SUMMER';
}

export interface DemandForecastItem {
  current: number;
  predicted_change_pct: number;
}

export interface DemandForecastResult {
  location_id: string;
  period_days: number;
  season: string;
  forecasts: {
    medicine: DemandForecastItem;
    food: DemandForecastItem;
    water: DemandForecastItem;
    emergency_kits: DemandForecastItem;
    fuel: DemandForecastItem;
  };
  pre_positioning: {
    recommendation: string;
    urgency: string;
  };
  data_source: string;
}

// --- Alerts ---
export interface Alert {
  id: string;
  severity: RiskLevel | 'WARNING' | 'ADVISORY' | 'INFORMATION';
  title: string;
  message: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  active: boolean;
  type: string;
}

// --- Copilot ---
export interface CopilotAction {
  label: string;
  action: string;
  target?: string;
}

export interface CopilotResponse {
  response: string;
  actions: CopilotAction[];
}

// --- Analytics ---
export interface AnalyticsKPIs {
  avgDeliveryTimeHrs: number;
  avgRouteRisk: number;
  emergencyResponseTimeHrs: number;
  routeFailureRatePct: number;
  regionalAccessibilityPct: number;
  vehicleUtilizationPct: number;
  avgCostPerDeliveryInr: number;
}

export interface DeliveryTrend {
  month: string;
  deliveries: number;
  delays: number;
  emergency: number;
}

export interface StateRisk {
  state: string;
  avgRisk: number;
  incidents: number;
}

export interface StateAccessibility {
  state: string;
  score: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  deliveryTrends: DeliveryTrend[];
  riskByState: StateRisk[];
  accessibilityByState: StateAccessibility[];
}

// --- Dashboard ---
export interface DashboardStats {
  activeDeliveries: number;
  highRiskRoutes: number;
  disruptions: number;
  emergencyMissions: number;
  regionalAccessibility: number;
  activeVehicles: number;
  lastUpdated: string;
}

// --- Auth ---
export interface User {
  name: string;
  role: 'operator' | 'officer';
  email: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

// --- AI Decision (HITL) ---
export interface AIDecision {
  id: string;
  type: string;
  recommendation: string;
  timestamp: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVIEWED' | 'OVERRIDDEN';
  override_reason?: string;
}

// --- Map ---
export interface MapData {
  locations: Location[];
  warehouses: Warehouse[];
  hospitals: Hospital[];
  vehicles: Vehicle[];
  alerts: Alert[];
}
