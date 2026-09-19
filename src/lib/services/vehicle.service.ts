import { getServiceSupabase } from '@/lib/db/supabase';
import { getAllVehicles } from '@/lib/db';
import { GeocodingLocation } from '@/lib/providers/types';

export interface VehicleProfile {
  id: string;
  registrationNumber: string;
  type: string;
  capacityKg: number;
  volumeM3: number;
  fuelType: string;
  terrainCapabilities: string[];
  maxGradientPct: number;
  maxWidthMeters: number;
  waterCrossingCapable: boolean;
  fuelPct: number;
  status: string;
  driver?: string;
}

export interface VehicleRecommendationRequest {
  cargoType: string;
  cargoWeightKg: number;
  cargoVolumeM3?: number;
  destination: GeocodingLocation;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresColdChain?: boolean;
}

export interface VehicleRecommendationResult {
  vehicle: VehicleProfile;
  compatibilityScore: number; // 0 to 100
  isRecommended: boolean;
  isEligible: boolean;
  disqualificationReason?: string;
  reasoning: string;
}

// Fallback fleet matching reference seed
const FALLBACK_VEHICLES: VehicleProfile[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    registrationNumber: 'AS-01-AX-1010',
    type: 'UTILITY_4X4',
    capacityKg: 1500,
    volumeM3: 5.0,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN', 'HILLY', 'MOUNTAINOUS', 'OFFROAD'],
    maxGradientPct: 35,
    maxWidthMeters: 2.0,
    waterCrossingCapable: true,
    fuelPct: 92,
    status: 'AVAILABLE',
    driver: 'Tenzing Norbu',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    registrationNumber: 'AS-01-BX-2020',
    type: 'LIGHT_VAN',
    capacityKg: 1200,
    volumeM3: 6.5,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN', 'HILLY'],
    maxGradientPct: 15,
    maxWidthMeters: 2.1,
    waterCrossingCapable: false,
    fuelPct: 88,
    status: 'AVAILABLE',
    driver: 'Biren Das',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    registrationNumber: 'MN-01-TX-3030',
    type: 'MEDIUM_TRUCK',
    capacityKg: 7500,
    volumeM3: 24.0,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN', 'HILLY'],
    maxGradientPct: 20,
    maxWidthMeters: 2.5,
    waterCrossingCapable: false,
    fuelPct: 80,
    status: 'AVAILABLE',
    driver: 'L. Sanatomba',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    registrationNumber: 'ML-05-HX-4040',
    type: 'HEAVY_TRUCK',
    capacityKg: 16000,
    volumeM3: 48.0,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN'],
    maxGradientPct: 12,
    maxWidthMeters: 2.6,
    waterCrossingCapable: false,
    fuelPct: 75,
    status: 'AVAILABLE',
    driver: 'K. Marbaniang',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    registrationNumber: 'AR-01-EX-5050',
    type: 'AMBULANCE',
    capacityKg: 800,
    volumeM3: 4.0,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN', 'HILLY', 'MOUNTAINOUS'],
    maxGradientPct: 28,
    maxWidthMeters: 2.0,
    waterCrossingCapable: true,
    fuelPct: 96,
    status: 'AVAILABLE',
    driver: 'Dorjee Khandu',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    registrationNumber: 'MZ-01-RX-6060',
    type: 'REFRIGERATED_TRUCK',
    capacityKg: 4500,
    volumeM3: 16.0,
    fuelType: 'DIESEL',
    terrainCapabilities: ['PLAIN', 'HILLY'],
    maxGradientPct: 18,
    maxWidthMeters: 2.4,
    waterCrossingCapable: false,
    fuelPct: 84,
    status: 'AVAILABLE',
    driver: 'Zoramthanga',
  },
];

/**
 * Recommends and ranks the entire fleet against destination and cargo constraints.
 */
export async function evaluateFleetForShipment(
  req: VehicleRecommendationRequest
): Promise<VehicleRecommendationResult[]> {
  const fleet = await getAvailableFleet();
  const results: VehicleRecommendationResult[] = [];

  const dest = req.destination;
  const cargoWeight = req.cargoWeightKg;
  const cargoVolume = req.cargoVolumeM3 || 1.0;
  const isColdChain = req.requiresColdChain || req.cargoType.toLowerCase().includes('vaccine') || req.cargoType.toLowerCase().includes('medicine') || req.cargoType.toLowerCase().includes('perishable');
  const isHighAltitude = dest.elevationMeters > 1500;
  const isRestrictedAccess = dest.roadAccessQuality === 'RESTRICTED' || dest.roadAccessQuality === '4X4_ONLY';

  for (const v of fleet) {
    let isEligible = true;
    let disqualificationReason = '';
    let score = 85;

    // 1. Weight Constraint
    if (cargoWeight > v.capacityKg) {
      isEligible = false;
      disqualificationReason = `Cargo weight (${cargoWeight}kg) exceeds vehicle capacity (${v.capacityKg}kg).`;
    }

    // 2. Volume Constraint
    else if (cargoVolume > v.volumeM3) {
      isEligible = false;
      disqualificationReason = `Cargo volume (${cargoVolume}m³) exceeds bay volume (${v.volumeM3}m³).`;
    }

    // 3. Cold-Chain Constraint
    else if (isColdChain && v.type !== 'REFRIGERATED_TRUCK' && v.type !== 'AMBULANCE') {
      isEligible = false;
      disqualificationReason = 'Temperature-controlled cargo requires a refrigerated vehicle.';
    }

    // 4. Narrow Mountain Road Width Constraint
    else if (isRestrictedAccess && v.maxWidthMeters > 2.2) {
      isEligible = false;
      disqualificationReason = `Vehicle width (${v.maxWidthMeters}m) exceeds narrow mountain road clearance (max 2.2m).`;
    }

    // 5. Steep Terrain Gradient Constraint
    else if (isHighAltitude && v.maxGradientPct < 25) {
      isEligible = false;
      disqualificationReason = `Inadequate powertrain gradeability (${v.maxGradientPct}%) for mountain destination (${dest.elevationMeters}m).`;
    }

    // 6. 4x4 Requirement
    else if (dest.roadAccessQuality === '4X4_ONLY' && !v.terrainCapabilities.includes('OFFROAD')) {
      isEligible = false;
      disqualificationReason = 'Destination requires an off-road 4x4 drivetrain with differential lock.';
    }

    // Calculate score for eligible vehicles
    let reasoning = '';
    if (isEligible) {
      const utilization = (cargoWeight / v.capacityKg) * 100;
      // Optimum capacity utilization is between 40% and 85%
      if (utilization >= 40 && utilization <= 85) score += 10;
      if (v.fuelPct > 80) score += 5;

      if (isRestrictedAccess && v.terrainCapabilities.includes('MOUNTAINOUS')) {
        score += 15;
        reasoning = `Highly suitable because ${dest.name} has restricted mountain access and this vehicle features high clearance with a ${v.maxGradientPct}% gradient limit.`;
      } else if (isColdChain) {
        reasoning = 'Equipped with active refrigeration unit meeting medical cold-chain standards.';
      } else {
        reasoning = `Well-suited for ${cargoWeight}kg cargo with ${utilization.toFixed(0)}% payload capacity utilization.`;
      }
    } else {
      score = 20;
      reasoning = disqualificationReason;
    }

    results.push({
      vehicle: v,
      compatibilityScore: Math.min(100, Math.max(0, score)),
      isRecommended: false,
      isEligible,
      disqualificationReason: isEligible ? undefined : disqualificationReason,
      reasoning,
    });
  }

  // Sort by compatibility score descending
  results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Mark the highest eligible vehicle as recommended
  const bestEligible = results.find((r) => r.isEligible);
  if (bestEligible) {
    bestEligible.isRecommended = true;
  }

  return results;
}

async function getAvailableFleet(): Promise<VehicleProfile[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('vehicles').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          registrationNumber: d.registration_number,
          type: d.type,
          capacityKg: Number(d.capacity_kg),
          volumeM3: Number(d.volume_m3) || 10.0,
          fuelType: d.fuel_type || 'DIESEL',
          terrainCapabilities: d.terrain_capabilities || ['PLAIN', 'HILLY'],
          maxGradientPct: d.max_gradient_pct || 20,
          maxWidthMeters: Number(d.max_width_meters) || 2.4,
          waterCrossingCapable: Boolean(d.water_crossing_capable),
          fuelPct: d.fuel_pct || 100,
          status: d.status,
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to local reference fleet
  return FALLBACK_VEHICLES;
}
