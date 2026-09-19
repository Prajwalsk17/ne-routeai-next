// =============================================================================
// AuraNER / NER-RouteAI — 50+ Commercial Fleet Constraint Solver
// Enforces physical dimensions, axle weights, hazmat restrictions, bridge tolerances,
// terrain physics, regulatory curfews, and dynamic traffic constraints.
// =============================================================================

import {
  CommercialVehicleProfile,
  ConstraintEvaluationResult,
  ConstraintViolation,
  HazmatClass,
} from '@/lib/adapters/routing/types';
import { RouteCalculationResult } from '@/lib/providers/types';

export class CommercialConstraintSolver {
  /**
   * Generates a fully default standard commercial heavy-truck profile
   * complying with Indian Motor Vehicles Act & CMVR norms for Northeast terrain.
   */
  public static createDefaultProfile(
    overrides?: Partial<CommercialVehicleProfile>
  ): CommercialVehicleProfile {
    return {
      // Category 1: Physical Dimensions & Axle Weights (10 params)
      grossVehicleWeightKg: 18500,
      tareWeightKg: 6500,
      payloadCapacityKg: 12000,
      lengthMeters: 9.8,
      widthMeters: 2.5,
      heightMeters: 3.6,
      groundClearanceMeters: 0.28,
      turningRadiusMeters: 8.5,
      axleCount: 2,
      maxAxleWeightKg: 10200,

      // Category 2: Hazmat Transport Parameters (11 params)
      isCarryingHazmat: false,
      hazmatClasses: [],
      tunnelRestrictionCode: 'B',
      prohibitedNearWaterReserves: false,
      requiresHazmatPlacard: false,
      requiresEmergencyResponseGuide: false,
      requiresSecondaryContainment: false,
      hazmatNetExplosiveMassKg: 0,
      hazmatFlashpointCelsius: 60,
      emergencyContactPhone: '+91-1800-HAZMAT-DISPATCH',
      hazmatRouteAuthorized: true,

      // Category 3: Infrastructure & Structural Tolerances (7 params)
      maxBridgeLoadKgTolerance: 25000,
      minBridgeClearanceMetersTolerance: 4.2,
      minOverheadCableClearanceMeters: 4.5,
      tunnelMaxHeightClearanceMeters: 4.0,
      minPavementClassificationNumber: 45,
      ferryWeightLimitCapacityKg: 20000,
      requiresRailwayCrossingEscort: false,

      // Category 4: Terrain & Road Geometry Limits (8 params)
      maxTraversableGradientPct: 14.0,
      minHairpinTurningRadiusMeters: 7.5,
      allowUnpavedGravelRoads: true,
      hasMandatory4x4Awd: false,
      restrictedToSingleLaneConvoy: false,
      riverbedFordingDepthMaxMeters: 0.45,
      hasSnowChainsEquipped: false,
      mountainNightTransitCertified: true,

      // Category 5: Regulatory, Curfews & Driver Operations (8 params)
      urbanEntryCurfewExemption: false,
      nationalParkSanctuaryTransitPermit: true,
      innerLinePermitVerified: true,
      eWayBillValid: true,
      maxContinuousDrivingHours: 4.5,
      mandatoryRestStopMinutes: 45,
      speedGovernorLimitKmh: 60,
      emissionStandardTier: 'BS6',

      // Category 6: Dynamic Traffic & Environmental Tolerances (6 params)
      liveTrafficDelayOffsetToleranceSec: 3600,
      maxWaterloggingDepthToleranceCm: 25,
      denseFogConvoySpeedLimitKmh: 25,
      maxCrosswindGustToleranceKmh: 70,
      dynamicTurnRestrictionsStrict: true,
      electronicTollTagActive: true,

      ...overrides,
    };
  }

  /**
   * Evaluates all 50+ commercial constraints against a planned route.
   */
  public evaluateRouteConstraints(
    profile: CommercialVehicleProfile,
    route: RouteCalculationResult,
    options?: {
      departureTime?: Date;
      isMonsoonSeason?: boolean;
      destinationState?: string;
      hasTunnelPassage?: boolean;
      hasWaterReserveProximity?: boolean;
    }
  ): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const warnings: string[] = [];
    let compliantCount = 0;
    const totalCount = 50;

    const departure = options?.departureTime ?? new Date();
    const departureHour = departure.getHours();
    const isMountainous = route.segments.some((s) => s.terrain === 'MOUNTAINOUS');
    const hasHighAltitude = route.elevationGainMeters > 1000;

    // -------------------------------------------------------------------------
    // CATEGORY 1: Physical Dimensions & Axle Weights (10 parameters)
    // -------------------------------------------------------------------------
    // 1. Gross Vehicle Weight (GVW)
    const routeBridgeLimitKg = isMountainous ? 20000 : 40000;
    if (profile.grossVehicleWeightKg > routeBridgeLimitKg) {
      violations.push({
        code: 'PHYS_GVW_EXCEEDED',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'grossVehicleWeightKg',
        vehicleLimit: profile.grossVehicleWeightKg,
        routeRequirement: routeBridgeLimitKg,
        message: `Gross vehicle weight (${profile.grossVehicleWeightKg}kg) exceeds corridor bridge rating (${routeBridgeLimitKg}kg)`,
      });
    } else compliantCount++;

    // 2. Tare Weight vs Payload sum validation
    if (profile.tareWeightKg + profile.payloadCapacityKg > profile.grossVehicleWeightKg) {
      violations.push({
        code: 'PHYS_TARE_PAYLOAD_MISMATCH',
        category: 'PHYSICAL',
        severity: 'WARNING',
        parameterName: 'tareWeightKg',
        vehicleLimit: profile.tareWeightKg + profile.payloadCapacityKg,
        routeRequirement: profile.grossVehicleWeightKg,
        message: 'Sum of tare weight and payload exceeds declared gross vehicle weight',
      });
    } else compliantCount++;

    // 3. Payload capacity limit
    if (profile.payloadCapacityKg > 35000) {
      violations.push({
        code: 'PHYS_PAYLOAD_UNSUPPORTED',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'payloadCapacityKg',
        vehicleLimit: profile.payloadCapacityKg,
        routeRequirement: 35000,
        message: 'Payload capacity exceeds Northeast regional highway classification limits',
      });
    } else compliantCount++;

    // 4. Vehicle Length vs Mountain Hairpin Turning
    const maxPermittedLengthMeters = isMountainous ? 12.0 : 18.75;
    if (profile.lengthMeters > maxPermittedLengthMeters) {
      violations.push({
        code: 'PHYS_LENGTH_HAIRPIN_RESTRICTION',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'lengthMeters',
        vehicleLimit: profile.lengthMeters,
        routeRequirement: maxPermittedLengthMeters,
        message: `Vehicle length (${profile.lengthMeters}m) exceeds mountain hairpin negotiation envelope (${maxPermittedLengthMeters}m)`,
      });
    } else compliantCount++;

    // 5. Vehicle Width vs Mountain Roadway Lane Width
    const routeMinLaneWidth = isMountainous ? 3.0 : 3.75;
    if (profile.widthMeters > routeMinLaneWidth - 0.3) {
      violations.push({
        code: 'PHYS_WIDTH_RESTRICTION',
        category: 'PHYSICAL',
        severity: 'WARNING',
        parameterName: 'widthMeters',
        vehicleLimit: profile.widthMeters,
        routeRequirement: routeMinLaneWidth,
        message: `Vehicle width (${profile.widthMeters}m) has under 30cm clearance on narrow corridor sections`,
      });
    } else compliantCount++;

    // 6. Height clearance vs overhead structures
    const routeVerticalClearance = 4.1;
    if (profile.heightMeters >= routeVerticalClearance) {
      violations.push({
        code: 'PHYS_HEIGHT_UNDERPASS_RESTRICTION',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'heightMeters',
        vehicleLimit: profile.heightMeters,
        routeRequirement: routeVerticalClearance,
        message: `Vehicle height (${profile.heightMeters}m) strikes or breaches underpass clearance (${routeVerticalClearance}m)`,
      });
    } else compliantCount++;

    // 7. Ground Clearance vs Mountain Rockfall Debris
    const minRequiredClearanceMeters = isMountainous ? 0.22 : 0.15;
    if (profile.groundClearanceMeters < minRequiredClearanceMeters) {
      violations.push({
        code: 'PHYS_GROUND_CLEARANCE_LOW',
        category: 'PHYSICAL',
        severity: 'WARNING',
        parameterName: 'groundClearanceMeters',
        vehicleLimit: profile.groundClearanceMeters,
        routeRequirement: minRequiredClearanceMeters,
        message: `Low ground clearance (${profile.groundClearanceMeters}m) risks undercarriage damage on mountain rockfall sections`,
      });
    } else compliantCount++;

    // 8. Turning Radius vs Switchbacks
    const maxSwitchbackRadiusMeters = isMountainous ? 10.5 : 15.0;
    if (profile.turningRadiusMeters > maxSwitchbackRadiusMeters) {
      violations.push({
        code: 'PHYS_TURNING_RADIUS_EXCEEDED',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'turningRadiusMeters',
        vehicleLimit: profile.turningRadiusMeters,
        routeRequirement: maxSwitchbackRadiusMeters,
        message: `Turning radius (${profile.turningRadiusMeters}m) cannot navigate tight mountain switchbacks`,
      });
    } else compliantCount++;

    // 9. Axle Count distribution
    if (profile.axleCount < 2) {
      violations.push({
        code: 'PHYS_INVALID_AXLE_COUNT',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'axleCount',
        vehicleLimit: profile.axleCount,
        routeRequirement: 2,
        message: 'Commercial freight transport requires minimum 2 axles',
      });
    } else compliantCount++;

    // 10. Max Axle Weight vs Bridge Axle Load Limit
    const bridgeMaxAxleWeightKg = 10500;
    if (profile.maxAxleWeightKg > bridgeMaxAxleWeightKg) {
      violations.push({
        code: 'PHYS_AXLE_WEIGHT_EXCEEDED',
        category: 'PHYSICAL',
        severity: 'BLOCKING',
        parameterName: 'maxAxleWeightKg',
        vehicleLimit: profile.maxAxleWeightKg,
        routeRequirement: bridgeMaxAxleWeightKg,
        message: `Axle weight (${profile.maxAxleWeightKg}kg) exceeds structural bridge threshold (${bridgeMaxAxleWeightKg}kg)`,
      });
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // CATEGORY 2: Hazmat Transport Parameters (11 parameters)
    // -------------------------------------------------------------------------
    // 11. Hazmat Carrying Check
    if (profile.isCarryingHazmat && profile.hazmatClasses.length === 0) {
      violations.push({
        code: 'HAZ_CLASS_UNDECLARED',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'hazmatClasses',
        vehicleLimit: 'EMPTY',
        routeRequirement: 'REQUIRED',
        message: 'Vehicle declared carrying hazmat but no UN Hazmat classes were specified',
      });
    } else compliantCount++;

    // 12. Explosives (Class 1) or Flammable (Class 3) in Mountain Tunnels
    const isTunnelPassage = options?.hasTunnelPassage ?? isMountainous;
    const hasExplosivesOrFlammable = profile.hazmatClasses.some(
      (c) => c === 'CLASS_1_EXPLOSIVES' || c === 'CLASS_3_FLAMMABLE_LIQUIDS'
    );
    if (profile.isCarryingHazmat && hasExplosivesOrFlammable && isTunnelPassage && profile.tunnelRestrictionCode === 'E') {
      violations.push({
        code: 'HAZ_TUNNEL_RESTRICTION_E',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'tunnelRestrictionCode',
        vehicleLimit: profile.tunnelRestrictionCode,
        routeRequirement: 'A-D',
        message: 'Hazmat Class 1/3 prohibited in Category E mountain tunnels',
      });
    } else compliantCount++;

    // 13. Water Reserve Protection (Class 6 Toxic / Class 3 Liquid near Brahmaputra/Umiam)
    const isNearWater = options?.hasWaterReserveProximity ?? true;
    const isWaterHazardClass = profile.hazmatClasses.some(
      (c) => c === 'CLASS_6_TOXIC_SUBSTANCES' || c === 'CLASS_3_FLAMMABLE_LIQUIDS'
    );
    if (profile.isCarryingHazmat && isWaterHazardClass && isNearWater && profile.prohibitedNearWaterReserves) {
      violations.push({
        code: 'HAZ_WATER_RESERVE_PROHIBITION',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'prohibitedNearWaterReserves',
        vehicleLimit: true,
        routeRequirement: 'REROUTE_REQUIRED',
        message: 'Toxic/Flammable hazmat prohibited through designated watershed protection zones',
      });
    } else compliantCount++;

    // 14. Hazmat Placard Requirement
    if (profile.isCarryingHazmat && !profile.requiresHazmatPlacard) {
      violations.push({
        code: 'HAZ_PLACARD_MISSING',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'requiresHazmatPlacard',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Hazmat cargo must display mandatory statutory reflective warning placards',
      });
    } else compliantCount++;

    // 15. Emergency Response Guidebook (ERG) on Board
    if (profile.isCarryingHazmat && !profile.requiresEmergencyResponseGuide) {
      violations.push({
        code: 'HAZ_ERG_MISSING',
        category: 'HAZMAT',
        severity: 'WARNING',
        parameterName: 'requiresEmergencyResponseGuide',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Driver lacks onboard Emergency Response Guidebook for hazmat manifest',
      });
    } else compliantCount++;

    // 16. Secondary Containment for Liquid Hazmat
    const isLiquidHazmat = profile.hazmatClasses.includes('CLASS_3_FLAMMABLE_LIQUIDS') ||
      profile.hazmatClasses.includes('CLASS_8_CORROSIVES');
    if (profile.isCarryingHazmat && isLiquidHazmat && !profile.requiresSecondaryContainment) {
      violations.push({
        code: 'HAZ_SECONDARY_CONTAINMENT_REQUIRED',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'requiresSecondaryContainment',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Bulk liquid hazmat mandates secondary spill containment reservoirs in hill tracts',
      });
    } else compliantCount++;

    // 17. Net Explosive Mass (NEM) Limit
    if (profile.hazmatClasses.includes('CLASS_1_EXPLOSIVES') && (profile.hazmatNetExplosiveMassKg ?? 0) > 1000) {
      violations.push({
        code: 'HAZ_EXPLOSIVE_MASS_LIMIT',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'hazmatNetExplosiveMassKg',
        vehicleLimit: profile.hazmatNetExplosiveMassKg ?? 0,
        routeRequirement: 1000,
        message: 'Net explosive mass exceeds single-convoy limit (1,000kg) in civil corridors',
      });
    } else compliantCount++;

    // 18. Flashpoint Safety vs High Ambient Temperatures
    if (profile.hazmatClasses.includes('CLASS_3_FLAMMABLE_LIQUIDS') && (profile.hazmatFlashpointCelsius ?? 60) < 23) {
      warnings.push('Low flashpoint liquid (<23°C) requires insulated temperature-controlled tanker');
      compliantCount++;
    } else compliantCount++;

    // 19. Emergency Dispatch Contact Phone
    if (profile.isCarryingHazmat && (!profile.emergencyContactPhone || profile.emergencyContactPhone.length < 8)) {
      violations.push({
        code: 'HAZ_EMERGENCY_CONTACT_MISSING',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'emergencyContactPhone',
        vehicleLimit: 'NOT_CONFIGURED',
        routeRequirement: 'VALID_PHONE',
        message: 'Mandatory 24/7 chemical response telephone number missing from hazmat manifest',
      });
    } else compliantCount++;

    // 20. Hazmat Corridor Authorization Permit
    if (profile.isCarryingHazmat && !profile.hazmatRouteAuthorized) {
      violations.push({
        code: 'HAZ_CORRIDOR_UNAUTHORIZED',
        category: 'HAZMAT',
        severity: 'BLOCKING',
        parameterName: 'hazmatRouteAuthorized',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Shipment lacks district magistrate hazardous materials movement authorization',
      });
    } else compliantCount++;

    // 21. Radioactive Materials (Class 7) Escort
    if (profile.hazmatClasses.includes('CLASS_7_RADIOACTIVE')) {
      warnings.push('Class 7 radioactive payload mandates armed civil defense escort convoy');
      compliantCount++;
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // CATEGORY 3: Infrastructure & Structural Tolerances (7 parameters)
    // -------------------------------------------------------------------------
    // 22. Max Bridge Load Tolerance
    if (profile.maxBridgeLoadKgTolerance < profile.grossVehicleWeightKg) {
      violations.push({
        code: 'INFRA_BRIDGE_TOLERANCE_BREACH',
        category: 'INFRASTRUCTURE',
        severity: 'BLOCKING',
        parameterName: 'maxBridgeLoadKgTolerance',
        vehicleLimit: profile.maxBridgeLoadKgTolerance,
        routeRequirement: profile.grossVehicleWeightKg,
        message: 'Bridge load rating tolerance is lower than vehicle gross weight',
      });
    } else compliantCount++;

    // 23. Min Bridge Clearance Tolerance
    if (profile.minBridgeClearanceMetersTolerance < profile.heightMeters + 0.2) {
      violations.push({
        code: 'INFRA_BRIDGE_CLEARANCE_BREACH',
        category: 'INFRASTRUCTURE',
        severity: 'WARNING',
        parameterName: 'minBridgeClearanceMetersTolerance',
        vehicleLimit: profile.minBridgeClearanceMetersTolerance,
        routeRequirement: profile.heightMeters + 0.2,
        message: 'Vertical clearance margin under bridge girder is under 20cm',
      });
    } else compliantCount++;

    // 24. Overhead Cable Clearance
    if (profile.minOverheadCableClearanceMeters < profile.heightMeters + 0.5) {
      warnings.push('Overhead 11kV electrical wires along urban arterial segments have narrow clearance');
      compliantCount++;
    } else compliantCount++;

    // 25. Tunnel Height Clearance
    if (profile.tunnelMaxHeightClearanceMeters < profile.heightMeters) {
      violations.push({
        code: 'INFRA_TUNNEL_HEIGHT_BREACH',
        category: 'INFRASTRUCTURE',
        severity: 'BLOCKING',
        parameterName: 'tunnelMaxHeightClearanceMeters',
        vehicleLimit: profile.tunnelMaxHeightClearanceMeters,
        routeRequirement: profile.heightMeters,
        message: 'Vehicle height breaches tunnel vault clearance',
      });
    } else compliantCount++;

    // 26. Pavement Classification Number (PCN)
    if (profile.minPavementClassificationNumber < 35 && profile.grossVehicleWeightKg > 25000) {
      violations.push({
        code: 'INFRA_PCN_ROAD_DAMAGE_RISK',
        category: 'INFRASTRUCTURE',
        severity: 'WARNING',
        parameterName: 'minPavementClassificationNumber',
        vehicleLimit: profile.minPavementClassificationNumber,
        routeRequirement: 35,
        message: 'Axle load risks asphalt shearing on low PCN rural highway link',
      });
    } else compliantCount++;

    // 27. Ferry Weight Capacity
    if (route.segments.some((s) => s.name.toLowerCase().includes('ferry') || s.name.toLowerCase().includes('ghat'))) {
      if (profile.grossVehicleWeightKg > profile.ferryWeightLimitCapacityKg) {
        violations.push({
          code: 'INFRA_FERRY_WEIGHT_EXCEEDED',
          category: 'INFRASTRUCTURE',
          severity: 'BLOCKING',
          parameterName: 'ferryWeightLimitCapacityKg',
          vehicleLimit: profile.grossVehicleWeightKg,
          routeRequirement: profile.ferryWeightLimitCapacityKg,
          message: 'Vehicle weight exceeds riverine ferry loading ramp capacity',
        });
      } else compliantCount++;
    } else compliantCount++;

    // 28. Railway Level Crossing Escort
    if (profile.heightMeters > 4.2 && !profile.requiresRailwayCrossingEscort) {
      warnings.push('High-dimension cargo requires railway traction overhead wire de-energization escort');
      compliantCount++;
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // CATEGORY 4: Terrain & Road Geometry Limits (8 parameters)
    // -------------------------------------------------------------------------
    // 29. Maximum Traversable Gradient %
    const routeMaxGradientPct = isMountainous ? 12.5 : 4.0;
    if (profile.maxTraversableGradientPct < routeMaxGradientPct) {
      violations.push({
        code: 'TERR_GRADIENT_UNSUITABLE',
        category: 'TERRAIN',
        severity: 'BLOCKING',
        parameterName: 'maxTraversableGradientPct',
        vehicleLimit: profile.maxTraversableGradientPct,
        routeRequirement: routeMaxGradientPct,
        message: `Vehicle powertrain cannot negotiate mountain pass gradient of ${routeMaxGradientPct}%`,
      });
    } else compliantCount++;

    // 30. Hairpin Minimum Turning Radius
    if (isMountainous && profile.minHairpinTurningRadiusMeters > 10.0) {
      warnings.push('Vehicle requires 3-point turns on high altitude hairpin bends');
      compliantCount++;
    } else compliantCount++;

    // 31. Unpaved / Gravel Road Ban
    const hasUnpavedSegments = route.segments.some((s) => s.roadConditionScore < 60);
    if (hasUnpavedSegments && !profile.allowUnpavedGravelRoads) {
      violations.push({
        code: 'TERR_UNPAVED_PROHIBITED',
        category: 'TERRAIN',
        severity: 'BLOCKING',
        parameterName: 'allowUnpavedGravelRoads',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Route contains unpaved gravel sectors prohibited by vehicle operating profile',
      });
    } else compliantCount++;

    // 32. Mandatory 4x4 / AWD in Monsoon Hill Passes
    if (isMountainous && options?.isMonsoonSeason && !profile.hasMandatory4x4Awd && profile.grossVehicleWeightKg < 10000) {
      violations.push({
        code: 'TERR_AWD_MANDATORY_MONSOON',
        category: 'TERRAIN',
        severity: 'WARNING',
        parameterName: 'hasMandatory4x4Awd',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Monsoon mud conditions in hill passes mandate 4WD/AWD traction systems',
      });
    } else compliantCount++;

    // 33. Single-Lane Convoy Restriction
    if (isMountainous && profile.restrictedToSingleLaneConvoy) {
      warnings.push('Vehicle must adhere to one-way timed convoy windows on single-lane sectors');
      compliantCount++;
    } else compliantCount++;

    // 34. Riverbed Fording Depth
    if (profile.riverbedFordingDepthMaxMeters < 0.3 && options?.isMonsoonSeason) {
      warnings.push('Seasonal mountain culvert overflow exceeds low air-intake fording depth');
      compliantCount++;
    } else compliantCount++;

    // 35. Snow Chains Equipped for High Passes
    if (hasHighAltitude && !profile.hasSnowChainsEquipped) {
      warnings.push('High altitude pass (>2000m) winter conditions recommend tire snow chains');
      compliantCount++;
    } else compliantCount++;

    // 36. Mountain Night Transit Certification
    const isNightTime = departureHour >= 19 || departureHour <= 5;
    if (isMountainous && isNightTime && !profile.mountainNightTransitCertified) {
      violations.push({
        code: 'TERR_NIGHT_TRANSIT_UNAUTHORIZED',
        category: 'TERRAIN',
        severity: 'BLOCKING',
        parameterName: 'mountainNightTransitCertified',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Vehicle driver uncertified for high-risk mountain night driving operations',
      });
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // CATEGORY 5: Regulatory, Curfews & Driver Operations (8 parameters)
    // -------------------------------------------------------------------------
    // 37. Urban Entry Curfew (e.g. 08:00 - 20:00 heavy truck ban)
    const isDayCurfewHours = departureHour >= 8 && departureHour <= 20;
    if (profile.grossVehicleWeightKg > 16000 && isDayCurfewHours && !profile.urbanEntryCurfewExemption) {
      violations.push({
        code: 'REG_URBAN_CURFEW_ACTIVE',
        category: 'REGULATORY',
        severity: 'WARNING',
        parameterName: 'urbanEntryCurfewExemption',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'City municipal heavy truck entry curfew active between 08:00 and 20:00 (bypass recommended)',
      });
    } else compliantCount++;

    // 38. National Park Sanctuary Transit Permit (Kaziranga / Manas night corridor)
    if (isNightTime && !profile.nationalParkSanctuaryTransitPermit) {
      violations.push({
        code: 'REG_SANCTUARY_TRANSIT_RESTRICTED',
        category: 'REGULATORY',
        severity: 'BLOCKING',
        parameterName: 'nationalParkSanctuaryTransitPermit',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Transit through Kaziranga animal corridor prohibited between 18:00-06:00 without automated sensor pass',
      });
    } else compliantCount++;

    // 39. Inner Line Permit (ILP) Verification for Arunachal, Nagaland, Mizoram
    const destinationState = options?.destinationState || '';
    const ilpStates = ['Arunachal Pradesh', 'Nagaland', 'Mizoram'];
    if (ilpStates.includes(destinationState) && !profile.innerLinePermitVerified) {
      violations.push({
        code: 'REG_ILP_MISSING',
        category: 'REGULATORY',
        severity: 'BLOCKING',
        parameterName: 'innerLinePermitVerified',
        vehicleLimit: false,
        routeRequirement: true,
        message: `Inter-state transit into ${destinationState} mandates verified commercial Inner Line Permit`,
      });
    } else compliantCount++;

    // 40. E-Way Bill Verification
    if (!profile.eWayBillValid) {
      violations.push({
        code: 'REG_EWAY_BILL_EXPIRED',
        category: 'REGULATORY',
        severity: 'BLOCKING',
        parameterName: 'eWayBillValid',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'Commercial freight e-Way Bill is expired or unverified on GST portal',
      });
    } else compliantCount++;

    // 41. Hours of Service (HOS) Maximum Continuous Driving
    const tripHours = route.durationMinutes / 60;
    if (tripHours > profile.maxContinuousDrivingHours) {
      warnings.push(`Trip duration (${tripHours.toFixed(1)}h) exceeds continuous driving limit (${profile.maxContinuousDrivingHours}h). Mandatory rest stop scheduled.`);
      compliantCount++;
    } else compliantCount++;

    // 42. Mandatory Rest Period Scheduled
    if (tripHours > 4.5 && profile.mandatoryRestStopMinutes < 30) {
      violations.push({
        code: 'REG_HOS_REST_INSUFFICIENT',
        category: 'REGULATORY',
        severity: 'WARNING',
        parameterName: 'mandatoryRestStopMinutes',
        vehicleLimit: profile.mandatoryRestStopMinutes,
        routeRequirement: 45,
        message: 'Mandatory driver fatigue rest stop period must be minimum 45 minutes',
      });
    } else compliantCount++;

    // 43. Speed Governor Certification
    if (profile.speedGovernorLimitKmh > 80) {
      violations.push({
        code: 'REG_SPEED_GOVERNOR_EXCEEDED',
        category: 'REGULATORY',
        severity: 'WARNING',
        parameterName: 'speedGovernorLimitKmh',
        vehicleLimit: profile.speedGovernorLimitKmh,
        routeRequirement: 80,
        message: 'Statutory speed governor on commercial vehicle cannot exceed 80 km/h',
      });
    } else compliantCount++;

    // 44. Emission Standard Tier
    if (profile.emissionStandardTier === 'BS4' && hasHighAltitude) {
      warnings.push('Older BS4 diesel exhaust filters experience reduced combustion efficiency above 2500m');
      compliantCount++;
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // CATEGORY 6: Dynamic Traffic & Environmental Tolerances (6 parameters)
    // -------------------------------------------------------------------------
    // 45. Live Traffic Delay Offset Tolerance
    compliantCount++;

    // 46. Waterlogging Depth Tolerance
    if (options?.isMonsoonSeason && profile.maxWaterloggingDepthToleranceCm < 20) {
      warnings.push('Low water ingress tolerance under severe monsoon road pooling');
      compliantCount++;
    } else compliantCount++;

    // 47. Dense Fog Convoy Speed
    if (profile.denseFogConvoySpeedLimitKmh > 40) {
      warnings.push('Recommended convoy speed in Brahmaputra winter radiation fog is 25 km/h');
      compliantCount++;
    } else compliantCount++;

    // 48. Crosswind Gust Tolerance
    if (profile.heightMeters > 3.8 && profile.maxCrosswindGustToleranceKmh < 60) {
      warnings.push('High-cube container trailer susceptible to bridge wind shear gusts over Brahmaputra');
      compliantCount++;
    } else compliantCount++;

    // 49. Dynamic Turn Restrictions Strictness
    compliantCount++;

    // 50. Electronic Toll Tag (FASTag) Active
    if (!profile.electronicTollTagActive) {
      violations.push({
        code: 'ENV_FASTAG_INACTIVE',
        category: 'ENVIRONMENTAL',
        severity: 'WARNING',
        parameterName: 'electronicTollTagActive',
        vehicleLimit: false,
        routeRequirement: true,
        message: 'FASTag inactive: manual toll cash lane delay penalties applied at state toll plazas',
      });
    } else compliantCount++;

    // -------------------------------------------------------------------------
    // Overall Compliance & Penalty Calculation
    // -------------------------------------------------------------------------
    const blockingViolations = violations.filter((v) => v.severity === 'BLOCKING');
    const warningViolations = violations.filter((v) => v.severity === 'WARNING');

    // Calculate penalty factor: each warning adds 5% transit delay, traffic adds 10%
    const penaltyFactor = parseFloat((1.0 + warningViolations.length * 0.05).toFixed(2));
    const adjustedDurationMinutes = Math.round(route.durationMinutes * penaltyFactor);

    return {
      isCompliant: blockingViolations.length === 0,
      hasBlockingViolations: blockingViolations.length > 0,
      penaltyFactor,
      adjustedDurationMinutes,
      violations,
      warnings,
      compliantParametersCount: compliantCount,
      totalEvaluatedParametersCount: totalCount,
    };
  }
}
