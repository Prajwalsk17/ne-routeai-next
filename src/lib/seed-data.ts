// ============================================
// NER-RouteAI — Seed Data for Northeast India
// Synthetic demo data — clearly labeled as such
// ============================================

import type {
  Location, Vehicle, Warehouse, Hospital, RoadSegment,
  Delivery, Alert, RiskFactors, AccessibilityScores,
  DashboardStats, AnalyticsData
} from './types';

// ---------- LOCATIONS (25 NER cities/towns) ----------
export const LOCATIONS: Location[] = [
  { id: 'LOC001', name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, type: 'city', population: 957352, elevation: 55 },
  { id: 'LOC002', name: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368, type: 'city', population: 414288, elevation: 786 },
  { id: 'LOC003', name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933, type: 'city', population: 354759, elevation: 1496 },
  { id: 'LOC004', name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868, type: 'city', population: 400004, elevation: 13 },
  { id: 'LOC005', name: 'Dimapur', state: 'Nagaland', lat: 25.9069, lng: 93.7258, type: 'city', population: 422032, elevation: 232 },
  { id: 'LOC006', name: 'Aizawl', state: 'Mizoram', lat: 23.7307, lng: 92.7173, type: 'city', population: 293416, elevation: 1132 },
  { id: 'LOC007', name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053, type: 'city', population: 44971, elevation: 360 },
  { id: 'LOC008', name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065, type: 'city', population: 100286, elevation: 1650 },
  { id: 'LOC009', name: 'Silchar', state: 'Assam', lat: 24.8333, lng: 92.7789, type: 'city', population: 228985, elevation: 20 },
  { id: 'LOC010', name: 'Jorhat', state: 'Assam', lat: 26.7509, lng: 94.2037, type: 'city', population: 153889, elevation: 116 },
  { id: 'LOC011', name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.9120, type: 'city', population: 154296, elevation: 108 },
  { id: 'LOC012', name: 'Tezpur', state: 'Assam', lat: 26.6338, lng: 92.8004, type: 'town', population: 58851, elevation: 79 },
  { id: 'LOC013', name: 'Kohima', state: 'Nagaland', lat: 25.6701, lng: 94.1077, type: 'city', population: 267988, elevation: 1444 },
  { id: 'LOC014', name: 'Pasighat', state: 'Arunachal Pradesh', lat: 28.0670, lng: 95.3335, type: 'town', population: 22161, elevation: 153 },
  { id: 'LOC015', name: 'Lunglei', state: 'Mizoram', lat: 22.8833, lng: 92.7333, type: 'town', population: 58986, elevation: 1133 },
  { id: 'LOC016', name: 'Churachandpur', state: 'Manipur', lat: 24.3333, lng: 93.6833, type: 'town', population: 56630, elevation: 920 },
  { id: 'LOC017', name: 'Mokokchung', state: 'Nagaland', lat: 26.3208, lng: 94.5198, type: 'town', population: 38474, elevation: 1325 },
  { id: 'LOC018', name: 'Tura', state: 'Meghalaya', lat: 25.5167, lng: 90.2167, type: 'town', population: 72104, elevation: 325 },
  { id: 'LOC019', name: 'North Lakhimpur', state: 'Assam', lat: 27.2377, lng: 94.1011, type: 'town', population: 56500, elevation: 101 },
  { id: 'LOC020', name: 'Nongstoin', state: 'Meghalaya', lat: 25.5167, lng: 91.2667, type: 'town', population: 12000, elevation: 1300 },
  { id: 'LOC021', name: 'Senapati', state: 'Manipur', lat: 25.2667, lng: 93.9667, type: 'town', population: 42800, elevation: 1450 },
  { id: 'LOC022', name: 'Ziro', state: 'Arunachal Pradesh', lat: 27.5500, lng: 93.8333, type: 'town', population: 8000, elevation: 1554 },
  { id: 'LOC023', name: 'Champhai', state: 'Mizoram', lat: 23.4608, lng: 93.3307, type: 'town', population: 15000, elevation: 1678 },
  { id: 'LOC024', name: 'Remote Hospital Karong', state: 'Manipur', lat: 25.1500, lng: 94.1000, type: 'village', population: 3200, elevation: 1680 },
  { id: 'LOC025', name: 'Bomdila', state: 'Arunachal Pradesh', lat: 27.2647, lng: 92.4178, type: 'town', population: 8500, elevation: 2415 },
];

// ---------- WAREHOUSES (10 logistics hubs) ----------
export const WAREHOUSES: Warehouse[] = [
  { id: 'WH001', name: 'Hub Alpha — Guwahati', locationId: 'LOC001', lat: 26.1445, lng: 91.7362, state: 'Assam', capacityTons: 500, currentLoadPct: 72, inventoryLevel: 'HIGH', riskScore: 22, accessibilityScore: 88, status: 'OPERATIONAL' },
  { id: 'WH002', name: 'Hub Bravo — Imphal', locationId: 'LOC002', lat: 24.8170, lng: 93.9368, state: 'Manipur', capacityTons: 200, currentLoadPct: 41, inventoryLevel: 'MEDIUM', riskScore: 58, accessibilityScore: 54, status: 'OPERATIONAL' },
  { id: 'WH003', name: 'Hub Charlie — Shillong', locationId: 'LOC003', lat: 25.5788, lng: 91.8933, state: 'Meghalaya', capacityTons: 300, currentLoadPct: 89, inventoryLevel: 'LOW', riskScore: 41, accessibilityScore: 71, status: 'NEAR_CAPACITY' },
  { id: 'WH004', name: 'Hub Delta — Agartala', locationId: 'LOC004', lat: 23.8315, lng: 91.2868, state: 'Tripura', capacityTons: 150, currentLoadPct: 55, inventoryLevel: 'MEDIUM', riskScore: 35, accessibilityScore: 67, status: 'OPERATIONAL' },
  { id: 'WH005', name: 'Hub Echo — Dimapur', locationId: 'LOC005', lat: 25.9069, lng: 93.7258, state: 'Nagaland', capacityTons: 180, currentLoadPct: 30, inventoryLevel: 'HIGH', riskScore: 29, accessibilityScore: 74, status: 'OPERATIONAL' },
  { id: 'WH006', name: 'Hub Foxtrot — Aizawl', locationId: 'LOC006', lat: 23.7307, lng: 92.7173, state: 'Mizoram', capacityTons: 100, currentLoadPct: 66, inventoryLevel: 'MEDIUM', riskScore: 62, accessibilityScore: 48, status: 'OPERATIONAL' },
  { id: 'WH007', name: 'Hub Golf — Silchar', locationId: 'LOC009', lat: 24.8333, lng: 92.7789, state: 'Assam', capacityTons: 220, currentLoadPct: 78, inventoryLevel: 'LOW', riskScore: 71, accessibilityScore: 61, status: 'ELEVATED_RISK' },
  { id: 'WH008', name: 'Hub Hotel — Jorhat', locationId: 'LOC010', lat: 26.7509, lng: 94.2037, state: 'Assam', capacityTons: 160, currentLoadPct: 44, inventoryLevel: 'MEDIUM', riskScore: 33, accessibilityScore: 69, status: 'OPERATIONAL' },
  { id: 'WH009', name: 'Emergency Cache — Tezpur', locationId: 'LOC012', lat: 26.6338, lng: 92.8004, state: 'Assam', capacityTons: 80, currentLoadPct: 20, inventoryLevel: 'HIGH', riskScore: 28, accessibilityScore: 76, status: 'OPERATIONAL' },
  { id: 'WH010', name: 'Forward Base — Itanagar', locationId: 'LOC007', lat: 27.0844, lng: 93.6053, state: 'Arunachal Pradesh', capacityTons: 120, currentLoadPct: 58, inventoryLevel: 'MEDIUM', riskScore: 55, accessibilityScore: 52, status: 'OPERATIONAL' },
];

// ---------- HOSPITALS (20 medical facilities) ----------
export const HOSPITALS: Hospital[] = [
  { id: 'HSP001', name: 'GMCH Guwahati', locationId: 'LOC001', lat: 26.1445, lng: 91.7362, state: 'Assam', beds: 1234, emergency: true, type: 'MAJOR' },
  { id: 'HSP002', name: 'RIMS Imphal', locationId: 'LOC002', lat: 24.8170, lng: 93.9368, state: 'Manipur', beds: 500, emergency: true, type: 'MAJOR' },
  { id: 'HSP003', name: 'Shillong Civil Hospital', locationId: 'LOC003', lat: 25.5788, lng: 91.8933, state: 'Meghalaya', beds: 300, emergency: true, type: 'MAJOR' },
  { id: 'HSP004', name: 'Agartala GBP Hospital', locationId: 'LOC004', lat: 23.8315, lng: 91.2868, state: 'Tripura', beds: 700, emergency: true, type: 'MAJOR' },
  { id: 'HSP005', name: 'Neigrihms Shillong', locationId: 'LOC003', lat: 25.5800, lng: 91.8950, state: 'Meghalaya', beds: 450, emergency: true, type: 'APEX' },
  { id: 'HSP006', name: 'Dimapur District Hospital', locationId: 'LOC005', lat: 25.9069, lng: 93.7258, state: 'Nagaland', beds: 200, emergency: true, type: 'DISTRICT' },
  { id: 'HSP007', name: 'Aizawl Civil Hospital', locationId: 'LOC006', lat: 23.7307, lng: 92.7173, state: 'Mizoram', beds: 250, emergency: true, type: 'MAJOR' },
  { id: 'HSP008', name: 'Silchar Medical College', locationId: 'LOC009', lat: 24.8333, lng: 92.7789, state: 'Assam', beds: 500, emergency: true, type: 'MAJOR' },
  { id: 'HSP009', name: 'Kohima General Hospital', locationId: 'LOC013', lat: 25.6701, lng: 94.1077, state: 'Nagaland', beds: 175, emergency: true, type: 'DISTRICT' },
  { id: 'HSP010', name: 'Jorhat Medical College', locationId: 'LOC010', lat: 26.7509, lng: 94.2037, state: 'Assam', beds: 400, emergency: true, type: 'MAJOR' },
  { id: 'HSP011', name: 'Gangtok STNM Hospital', locationId: 'LOC008', lat: 27.3389, lng: 88.6065, state: 'Sikkim', beds: 300, emergency: true, type: 'MAJOR' },
  { id: 'HSP012', name: 'Tezpur Medical College', locationId: 'LOC012', lat: 26.6338, lng: 92.8004, state: 'Assam', beds: 350, emergency: true, type: 'MAJOR' },
  { id: 'HSP013', name: 'Churachandpur CHC', locationId: 'LOC016', lat: 24.3333, lng: 93.6833, state: 'Manipur', beds: 50, emergency: true, type: 'CHC' },
  { id: 'HSP014', name: 'Karong PHC', locationId: 'LOC024', lat: 25.1500, lng: 94.1000, state: 'Manipur', beds: 20, emergency: false, type: 'PHC' },
  { id: 'HSP015', name: 'Bomdila District Hospital', locationId: 'LOC025', lat: 27.2647, lng: 92.4178, state: 'Arunachal Pradesh', beds: 80, emergency: true, type: 'DISTRICT' },
  { id: 'HSP016', name: 'Tura Civil Hospital', locationId: 'LOC018', lat: 25.5167, lng: 90.2167, state: 'Meghalaya', beds: 150, emergency: true, type: 'DISTRICT' },
  { id: 'HSP017', name: 'North Lakhimpur Civil Hospital', locationId: 'LOC019', lat: 27.2377, lng: 94.1011, state: 'Assam', beds: 100, emergency: true, type: 'DISTRICT' },
  { id: 'HSP018', name: 'Senapati District Hospital', locationId: 'LOC021', lat: 25.2667, lng: 93.9667, state: 'Manipur', beds: 60, emergency: true, type: 'DISTRICT' },
  { id: 'HSP019', name: 'Ziro CHC', locationId: 'LOC022', lat: 27.5500, lng: 93.8333, state: 'Arunachal Pradesh', beds: 30, emergency: true, type: 'CHC' },
  { id: 'HSP020', name: 'TRIHMS Agartala', locationId: 'LOC004', lat: 23.8350, lng: 91.2900, state: 'Tripura', beds: 600, emergency: true, type: 'APEX' },
];

// ---------- VEHICLES (25 fleet units) ----------
export const VEHICLES: Vehicle[] = [
  { id: 'TRK-101', type: 'TRUCK', capacityTons: 10, state: 'Assam', currentLocation: 'LOC001', lat: 26.1445, lng: 91.7362, status: 'AVAILABLE', driver: 'Rajesh Kumar', fuelPct: 87, riskTolerance: 'HIGH' },
  { id: 'TRK-102', type: 'TRUCK', capacityTons: 5, state: 'Assam', currentLocation: 'LOC001', lat: 26.1500, lng: 91.7400, status: 'IN_TRANSIT', driver: 'Suresh Baruah', fuelPct: 65, riskTolerance: 'MEDIUM' },
  { id: 'TRK-103', type: 'TRUCK', capacityTons: 8, state: 'Manipur', currentLocation: 'LOC002', lat: 24.8200, lng: 93.9400, status: 'AVAILABLE', driver: 'Tomba Singh', fuelPct: 91, riskTolerance: 'HIGH' },
  { id: 'TRK-104', type: 'TRUCK', capacityTons: 2, state: 'Assam', currentLocation: 'LOC001', lat: 26.1420, lng: 91.7330, status: 'AVAILABLE', driver: 'Bimal Das', fuelPct: 95, riskTolerance: 'HIGH' },
  { id: 'TRK-105', type: 'TRUCK', capacityTons: 15, state: 'Meghalaya', currentLocation: 'LOC003', lat: 25.5800, lng: 91.8950, status: 'AVAILABLE', driver: 'Amos Lyngdoh', fuelPct: 70, riskTolerance: 'MEDIUM' },
  { id: 'TRK-221', type: 'TRUCK', capacityTons: 5, state: 'Assam', currentLocation: 'LOC012', lat: 26.6338, lng: 92.8004, status: 'IN_TRANSIT', driver: 'Pradeep Saikia', fuelPct: 52, riskTolerance: 'MEDIUM' },
  { id: 'TRK-222', type: 'TRUCK', capacityTons: 10, state: 'Assam', currentLocation: 'LOC010', lat: 26.7509, lng: 94.2037, status: 'AVAILABLE', driver: 'Dipak Gogoi', fuelPct: 88, riskTolerance: 'HIGH' },
  { id: 'VAN-301', type: 'VAN', capacityTons: 1, state: 'Manipur', currentLocation: 'LOC002', lat: 24.8150, lng: 93.9350, status: 'AVAILABLE', driver: 'Ibomcha Meitei', fuelPct: 79, riskTolerance: 'HIGH' },
  { id: 'VAN-302', type: 'VAN', capacityTons: 1.5, state: 'Meghalaya', currentLocation: 'LOC003', lat: 25.5770, lng: 91.8910, status: 'AVAILABLE', driver: 'Pyrdon War', fuelPct: 83, riskTolerance: 'HIGH' },
  { id: 'HLI-401', type: 'HELICOPTER', capacityTons: 0.8, state: 'Assam', currentLocation: 'LOC001', lat: 26.1060, lng: 91.5858, status: 'STANDBY', driver: 'Capt. Arun Verma', fuelPct: 100, riskTolerance: 'HIGH' },
  { id: 'HLI-402', type: 'HELICOPTER', capacityTons: 1.2, state: 'Manipur', currentLocation: 'LOC002', lat: 24.7581, lng: 93.8974, status: 'AVAILABLE', driver: 'Capt. Ritu Singh', fuelPct: 95, riskTolerance: 'HIGH' },
  { id: 'BOT-501', type: 'BOAT', capacityTons: 3, state: 'Assam', currentLocation: 'LOC001', lat: 26.1800, lng: 91.7500, status: 'AVAILABLE', driver: 'Mridul Nath', fuelPct: 74, riskTolerance: 'HIGH' },
  { id: 'TRK-601', type: 'TRUCK', capacityTons: 8, state: 'Tripura', currentLocation: 'LOC004', lat: 23.8315, lng: 91.2868, status: 'AVAILABLE', driver: 'Biplab Dey', fuelPct: 82, riskTolerance: 'MEDIUM' },
  { id: 'TRK-602', type: 'TRUCK', capacityTons: 12, state: 'Tripura', currentLocation: 'LOC004', lat: 23.8350, lng: 91.2900, status: 'MAINTENANCE', driver: 'Sanjib Roy', fuelPct: 0, riskTolerance: 'MEDIUM' },
  { id: 'VAN-701', type: 'VAN', capacityTons: 1, state: 'Mizoram', currentLocation: 'LOC006', lat: 23.7307, lng: 92.7173, status: 'AVAILABLE', driver: 'Laldika Sailo', fuelPct: 90, riskTolerance: 'HIGH' },
  { id: 'TRK-801', type: 'TRUCK', capacityTons: 6, state: 'Nagaland', currentLocation: 'LOC013', lat: 25.6701, lng: 94.1077, status: 'IN_TRANSIT', driver: 'Zatuhu Kevi', fuelPct: 44, riskTolerance: 'LOW' },
  { id: 'TRK-901', type: 'TRUCK', capacityTons: 7, state: 'Arunachal Pradesh', currentLocation: 'LOC007', lat: 27.0844, lng: 93.6053, status: 'AVAILABLE', driver: 'Tage Tatung', fuelPct: 77, riskTolerance: 'MEDIUM' },
  { id: 'EMG-001', type: 'AMBULANCE_TRUCK', capacityTons: 1, state: 'Assam', currentLocation: 'LOC001', lat: 26.1460, lng: 91.7380, status: 'STANDBY', driver: 'Dr. Hemanta Bora', fuelPct: 100, riskTolerance: 'HIGH' },
  { id: 'EMG-002', type: 'AMBULANCE_TRUCK', capacityTons: 1, state: 'Manipur', currentLocation: 'LOC002', lat: 24.8180, lng: 93.9380, status: 'AVAILABLE', driver: 'Dr. Shanta Devi', fuelPct: 98, riskTolerance: 'HIGH' },
  { id: 'TRK-B01', type: 'TRUCK', capacityTons: 9, state: 'Assam', currentLocation: 'LOC011', lat: 27.4728, lng: 94.9120, status: 'AVAILABLE', driver: 'Narendra Hazarika', fuelPct: 85, riskTolerance: 'MEDIUM' },
  { id: 'TRK-A01', type: 'TRUCK', capacityTons: 4, state: 'Sikkim', currentLocation: 'LOC008', lat: 27.3389, lng: 88.6065, status: 'AVAILABLE', driver: 'Dorje Sherpa', fuelPct: 93, riskTolerance: 'HIGH' },
  { id: 'TRK-A02', type: 'TRUCK', capacityTons: 5, state: 'Assam', currentLocation: 'LOC009', lat: 24.8333, lng: 92.7789, status: 'IN_TRANSIT', driver: 'Kamal Laskar', fuelPct: 55, riskTolerance: 'MEDIUM' },
  { id: 'VAN-902', type: 'VAN', capacityTons: 1, state: 'Arunachal Pradesh', currentLocation: 'LOC014', lat: 28.0670, lng: 95.3335, status: 'AVAILABLE', driver: 'Joram Bagra', fuelPct: 68, riskTolerance: 'HIGH' },
  { id: 'TRK-B02', type: 'TRUCK', capacityTons: 6, state: 'Meghalaya', currentLocation: 'LOC018', lat: 25.5167, lng: 90.2167, status: 'AVAILABLE', driver: 'Kiran Koch', fuelPct: 72, riskTolerance: 'MEDIUM' },
  { id: 'VAN-303', type: 'VAN', capacityTons: 1, state: 'Nagaland', currentLocation: 'LOC005', lat: 25.9069, lng: 93.7258, status: 'IN_TRANSIT', driver: 'Vizovu Khel', fuelPct: 61, riskTolerance: 'MEDIUM' },
];

// ---------- ROAD SEGMENTS (15 corridors) ----------
export const ROAD_SEGMENTS: RoadSegment[] = [
  { id: 'RS001', name: 'NH-27 Guwahati–Shillong', fromLoc: 'LOC001', toLoc: 'LOC003', distanceKm: 103, baseTimeHr: 2.5, roadCondition: 75, riskScore: 32, weatherScore: 70, costPerKm: 22, accessibility: 82, status: 'OPEN', terrain: 'HILLY' },
  { id: 'RS002', name: 'NH-37 Guwahati–Dimapur', fromLoc: 'LOC001', toLoc: 'LOC005', distanceKm: 265, baseTimeHr: 5.5, roadCondition: 68, riskScore: 41, weatherScore: 65, costPerKm: 28, accessibility: 71, status: 'OPEN', terrain: 'MIXED' },
  { id: 'RS003', name: 'NH-2 Dimapur–Imphal', fromLoc: 'LOC005', toLoc: 'LOC002', distanceKm: 215, baseTimeHr: 6.0, roadCondition: 55, riskScore: 68, weatherScore: 52, costPerKm: 35, accessibility: 58, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS004', name: 'NH-40 Shillong–Silchar', fromLoc: 'LOC003', toLoc: 'LOC009', distanceKm: 250, baseTimeHr: 7.0, roadCondition: 48, riskScore: 72, weatherScore: 45, costPerKm: 38, accessibility: 51, status: 'PARTIAL', terrain: 'MOUNTAINOUS' },
  { id: 'RS005', name: 'NH-54 Silchar–Aizawl', fromLoc: 'LOC009', toLoc: 'LOC006', distanceKm: 185, baseTimeHr: 6.5, roadCondition: 42, riskScore: 78, weatherScore: 40, costPerKm: 45, accessibility: 44, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS006', name: 'NH-306 Agartala–Silchar', fromLoc: 'LOC004', toLoc: 'LOC009', distanceKm: 195, baseTimeHr: 5.5, roadCondition: 62, riskScore: 48, weatherScore: 60, costPerKm: 30, accessibility: 64, status: 'OPEN', terrain: 'HILLY' },
  { id: 'RS007', name: 'NH-13 Itanagar–Dibrugarh', fromLoc: 'LOC007', toLoc: 'LOC011', distanceKm: 350, baseTimeHr: 9.0, roadCondition: 38, riskScore: 82, weatherScore: 35, costPerKm: 50, accessibility: 38, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS008', name: 'Gangtok–Guwahati', fromLoc: 'LOC008', toLoc: 'LOC001', distanceKm: 400, baseTimeHr: 10.0, roadCondition: 65, riskScore: 55, weatherScore: 58, costPerKm: 40, accessibility: 60, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS009', name: 'NH-36 Guwahati–Tezpur', fromLoc: 'LOC001', toLoc: 'LOC012', distanceKm: 93, baseTimeHr: 2.0, roadCondition: 80, riskScore: 25, weatherScore: 78, costPerKm: 20, accessibility: 85, status: 'OPEN', terrain: 'PLAIN' },
  { id: 'RS010', name: 'NH-715 Kohima–Mokokchung', fromLoc: 'LOC013', toLoc: 'LOC017', distanceKm: 140, baseTimeHr: 4.5, roadCondition: 45, riskScore: 75, weatherScore: 42, costPerKm: 42, accessibility: 46, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS011', name: 'Senapati–Imphal Corridor', fromLoc: 'LOC021', toLoc: 'LOC002', distanceKm: 72, baseTimeHr: 2.8, roadCondition: 50, riskScore: 70, weatherScore: 48, costPerKm: 36, accessibility: 52, status: 'OPEN', terrain: 'HILLY' },
  { id: 'RS012', name: 'Imphal–Karong Remote Track', fromLoc: 'LOC002', toLoc: 'LOC024', distanceKm: 95, baseTimeHr: 4.5, roadCondition: 30, riskScore: 88, weatherScore: 32, costPerKm: 55, accessibility: 32, status: 'OPEN', terrain: 'MOUNTAINOUS' },
  { id: 'RS013', name: 'Tezpur–Itanagar Link', fromLoc: 'LOC012', toLoc: 'LOC007', distanceKm: 162, baseTimeHr: 5.0, roadCondition: 58, riskScore: 62, weatherScore: 55, costPerKm: 38, accessibility: 57, status: 'OPEN', terrain: 'HILLY' },
  { id: 'RS014', name: 'Dimapur–Kohima Corridor', fromLoc: 'LOC005', toLoc: 'LOC013', distanceKm: 74, baseTimeHr: 2.2, roadCondition: 70, riskScore: 38, weatherScore: 65, costPerKm: 26, accessibility: 72, status: 'OPEN', terrain: 'HILLY' },
  { id: 'RS015', name: 'Guwahati–Jorhat Expressway', fromLoc: 'LOC001', toLoc: 'LOC010', distanceKm: 298, baseTimeHr: 5.0, roadCondition: 88, riskScore: 18, weatherScore: 85, costPerKm: 18, accessibility: 90, status: 'OPEN', terrain: 'PLAIN' },
];

// ---------- DELIVERIES (8 active) ----------
export const DELIVERIES: Delivery[] = [
  { id: 'DEL001', originId: 'LOC001', destinationId: 'LOC002', vehicleId: 'TRK-102', cargoType: 'Medical Supplies', cargoWeightKg: 800, priority: 'HIGH', status: 'IN_TRANSIT', progressPct: 45, etaHours: 4.2, risk: 'MODERATE' },
  { id: 'DEL002', originId: 'LOC001', destinationId: 'LOC013', vehicleId: 'TRK-221', cargoType: 'Food & Rations', cargoWeightKg: 2000, priority: 'MEDIUM', status: 'IN_TRANSIT', progressPct: 72, etaHours: 1.5, risk: 'LOW' },
  { id: 'DEL003', originId: 'LOC003', destinationId: 'LOC009', vehicleId: 'VAN-302', cargoType: 'Emergency Kits', cargoWeightKg: 300, priority: 'CRITICAL', status: 'DELAYED', progressPct: 30, etaHours: 8.5, risk: 'HIGH' },
  { id: 'DEL004', originId: 'LOC004', destinationId: 'LOC006', vehicleId: 'TRK-601', cargoType: 'Fuel', cargoWeightKg: 5000, priority: 'HIGH', status: 'IN_TRANSIT', progressPct: 60, etaHours: 3.8, risk: 'MODERATE' },
  { id: 'DEL005', originId: 'LOC005', destinationId: 'LOC017', vehicleId: 'TRK-801', cargoType: 'Water Purification', cargoWeightKg: 1200, priority: 'HIGH', status: 'IN_TRANSIT', progressPct: 18, etaHours: 3.7, risk: 'HIGH' },
  { id: 'DEL006', originId: 'LOC001', destinationId: 'LOC024', vehicleId: 'EMG-001', cargoType: 'Emergency Medicine', cargoWeightKg: 500, priority: 'CRITICAL', status: 'PENDING', progressPct: 0, etaHours: 8.8, risk: 'HIGH' },
  { id: 'DEL007', originId: 'LOC010', destinationId: 'LOC007', vehicleId: 'TRK-222', cargoType: 'Construction Materials', cargoWeightKg: 8000, priority: 'LOW', status: 'PENDING', progressPct: 0, etaHours: 12.0, risk: 'MODERATE' },
  { id: 'DEL008', originId: 'LOC001', destinationId: 'LOC008', vehicleId: 'TRK-B01', cargoType: 'Disaster Relief', cargoWeightKg: 6000, priority: 'HIGH', status: 'IN_TRANSIT', progressPct: 25, etaHours: 7.5, risk: 'MODERATE' },
];

// ---------- ALERTS (8 active) ----------
export const ALERTS: Alert[] = [
  { id: 'ALT001', severity: 'CRITICAL', title: 'Route R4 Blocked', message: 'NH-2 Dimapur–Imphal blocked due to landslide near Maram. Alternative via Senapati advised.', location: 'Maram, Manipur', lat: 25.1, lng: 94.0, timestamp: '2026-09-08T09:15:00', active: true, type: 'LANDSLIDE' },
  { id: 'ALT002', severity: 'WARNING', title: 'Heavy Rainfall Alert', message: 'IMD forecasts 150mm+ rainfall in next 12 hours over Meghalaya and Assam valleys. Flood risk elevated.', location: 'Meghalaya, Assam', lat: 25.5, lng: 91.8, timestamp: '2026-09-08T10:30:00', active: true, type: 'WEATHER' },
  { id: 'ALT003', severity: 'ADVISORY', title: 'TRK-221 High-Risk Zone', message: 'Vehicle TRK-221 approaching high-risk corridor on NH-40. Recommend speed reduction.', location: 'NH-40 Shillong–Silchar', lat: 24.8, lng: 92.0, timestamp: '2026-09-08T11:00:00', active: true, type: 'VEHICLE' },
  { id: 'ALT004', severity: 'INFORMATION', title: 'Alternative Route Available', message: 'Route via Senapati now available as bypass for blocked NH-2. ETA increase: +36 minutes.', location: 'Manipur', lat: 25.3, lng: 93.9, timestamp: '2026-09-08T11:05:00', active: true, type: 'ROUTING' },
  { id: 'ALT005', severity: 'WARNING', title: 'Bridge Load Restriction', message: 'Barak Bridge on NH-306 has 10T load restriction due to maintenance. Reroute heavy vehicles.', location: 'NH-306, Assam', lat: 24.6, lng: 92.5, timestamp: '2026-09-08T08:00:00', active: true, type: 'INFRASTRUCTURE' },
  { id: 'ALT006', severity: 'CRITICAL', title: 'Flood Imminent — Brahmaputra', message: 'Brahmaputra river level rising rapidly. Flood imminent in low-lying areas of Guwahati outskirts.', location: 'Guwahati, Assam', lat: 26.2, lng: 91.8, timestamp: '2026-09-08T12:00:00', active: true, type: 'FLOOD' },
  { id: 'ALT007', severity: 'INFORMATION', title: 'Emergency Cache Activated', message: 'Emergency cache at Tezpur activated. Priority supplies available for rapid deployment.', location: 'Tezpur, Assam', lat: 26.6338, lng: 92.8004, timestamp: '2026-09-08T13:30:00', active: true, type: 'LOGISTICS' },
  { id: 'ALT008', severity: 'WARNING', title: 'Landslide Risk — Aizawl Corridor', message: 'Predicted 68% landslide probability on Silchar–Aizawl corridor in next 24 hours.', location: 'Silchar–Aizawl', lat: 23.3, lng: 92.5, timestamp: '2026-09-08T07:45:00', active: true, type: 'LANDSLIDE' },
];

// ---------- RISK DATA (per location) ----------
export const RISK_DATA: Record<string, RiskFactors> = {
  LOC001: { rainfall: 45, terrain: 15, historical: 28, roadCondition: 22, floodIndicator: 55, overall: 32, status: 'LOW' },
  LOC002: { rainfall: 68, terrain: 72, historical: 58, roadCondition: 55, floodIndicator: 42, overall: 61, status: 'MODERATE' },
  LOC003: { rainfall: 78, terrain: 68, historical: 45, roadCondition: 42, floodIndicator: 35, overall: 58, status: 'MODERATE' },
  LOC004: { rainfall: 52, terrain: 22, historical: 38, roadCondition: 48, floodIndicator: 61, overall: 44, status: 'MODERATE' },
  LOC005: { rainfall: 60, terrain: 55, historical: 48, roadCondition: 50, floodIndicator: 38, overall: 52, status: 'MODERATE' },
  LOC006: { rainfall: 82, terrain: 85, historical: 65, roadCondition: 55, floodIndicator: 30, overall: 70, status: 'HIGH' },
  LOC007: { rainfall: 70, terrain: 78, historical: 62, roadCondition: 48, floodIndicator: 28, overall: 63, status: 'HIGH' },
  LOC008: { rainfall: 65, terrain: 82, historical: 55, roadCondition: 58, floodIndicator: 22, overall: 61, status: 'MODERATE' },
  LOC009: { rainfall: 85, terrain: 55, historical: 70, roadCondition: 50, floodIndicator: 75, overall: 72, status: 'HIGH' },
  LOC021: { rainfall: 75, terrain: 80, historical: 70, roadCondition: 42, floodIndicator: 38, overall: 67, status: 'HIGH' },
  LOC024: { rainfall: 88, terrain: 90, historical: 78, roadCondition: 25, floodIndicator: 40, overall: 78, status: 'HIGH' },
};

// ---------- ACCESSIBILITY DATA (per location) ----------
export const ACCESSIBILITY_DATA: Record<string, AccessibilityScores> = {
  LOC001: { road: 92, transport: 88, healthcare: 90, emergency: 87, digital: 85, lastMile: 82, overall: 88, classification: 'EXCELLENT' },
  LOC002: { road: 65, transport: 58, healthcare: 72, emergency: 62, digital: 70, lastMile: 55, overall: 64, classification: 'MODERATE' },
  LOC003: { road: 75, transport: 70, healthcare: 80, emergency: 72, digital: 78, lastMile: 65, overall: 74, classification: 'GOOD' },
  LOC004: { road: 72, transport: 65, healthcare: 75, emergency: 68, digital: 62, lastMile: 60, overall: 68, classification: 'MODERATE' },
  LOC005: { road: 78, transport: 72, healthcare: 70, emergency: 74, digital: 68, lastMile: 65, overall: 72, classification: 'GOOD' },
  LOC006: { road: 52, transport: 45, healthcare: 60, emergency: 50, digital: 55, lastMile: 40, overall: 51, classification: 'MODERATE' },
  LOC007: { road: 48, transport: 40, healthcare: 50, emergency: 44, digital: 45, lastMile: 35, overall: 44, classification: 'POOR' },
  LOC008: { road: 60, transport: 55, healthcare: 65, emergency: 58, digital: 62, lastMile: 50, overall: 59, classification: 'MODERATE' },
  LOC009: { road: 62, transport: 58, healthcare: 68, emergency: 60, digital: 55, lastMile: 52, overall: 60, classification: 'MODERATE' },
  LOC013: { road: 55, transport: 48, healthcare: 58, emergency: 52, digital: 50, lastMile: 42, overall: 52, classification: 'MODERATE' },
  LOC016: { road: 40, transport: 35, healthcare: 38, emergency: 36, digital: 30, lastMile: 28, overall: 35, classification: 'POOR' },
  LOC021: { road: 42, transport: 36, healthcare: 40, emergency: 38, digital: 35, lastMile: 30, overall: 38, classification: 'POOR' },
  LOC024: { road: 22, transport: 18, healthcare: 15, emergency: 20, digital: 12, lastMile: 14, overall: 17, classification: 'CRITICAL' },
  LOC025: { road: 38, transport: 30, healthcare: 35, emergency: 32, digital: 28, lastMile: 25, overall: 32, classification: 'POOR' },
};

// ---------- DEMAND DATA ----------
export const DEMAND_DATA: Record<string, { medicine: number; food: number; water: number; emergencyKits: number; fuel: number; demandLevel: string }> = {
  LOC002: { medicine: 78, food: 65, water: 82, emergencyKits: 70, fuel: 55, demandLevel: 'HIGH' },
  LOC006: { medicine: 60, food: 72, water: 88, emergencyKits: 65, fuel: 45, demandLevel: 'HIGH' },
  LOC007: { medicine: 55, food: 68, water: 75, emergencyKits: 58, fuel: 40, demandLevel: 'MEDIUM' },
  LOC009: { medicine: 70, food: 78, water: 90, emergencyKits: 80, fuel: 62, demandLevel: 'HIGH' },
  LOC024: { medicine: 89, food: 85, water: 92, emergencyKits: 88, fuel: 70, demandLevel: 'CRITICAL' },
  LOC016: { medicine: 72, food: 70, water: 80, emergencyKits: 75, fuel: 55, demandLevel: 'HIGH' },
  LOC021: { medicine: 68, food: 75, water: 85, emergencyKits: 72, fuel: 58, demandLevel: 'HIGH' },
};

// ---------- DASHBOARD STATS ----------
export const DASHBOARD_STATS: DashboardStats = {
  activeDeliveries: 128,
  highRiskRoutes: 17,
  disruptions: 8,
  emergencyMissions: 4,
  regionalAccessibility: 72,
  activeVehicles: 436,
  lastUpdated: new Date().toISOString(),
};

// ---------- ANALYTICS DATA ----------
export const ANALYTICS_DATA: AnalyticsData = {
  kpis: {
    avgDeliveryTimeHrs: 6.8,
    avgRouteRisk: 48,
    emergencyResponseTimeHrs: 2.4,
    routeFailureRatePct: 3.2,
    regionalAccessibilityPct: 72,
    vehicleUtilizationPct: 68,
    avgCostPerDeliveryInr: 14800,
  },
  deliveryTrends: [
    { month: 'Apr', deliveries: 98, delays: 8, emergency: 2 },
    { month: 'May', deliveries: 112, delays: 11, emergency: 3 },
    { month: 'Jun', deliveries: 125, delays: 18, emergency: 5 },
    { month: 'Jul', deliveries: 118, delays: 22, emergency: 7 },
    { month: 'Aug', deliveries: 131, delays: 25, emergency: 6 },
    { month: 'Sep', deliveries: 128, delays: 17, emergency: 4 },
  ],
  riskByState: [
    { state: 'Assam', avgRisk: 42, incidents: 3 },
    { state: 'Manipur', avgRisk: 61, incidents: 5 },
    { state: 'Meghalaya', avgRisk: 58, incidents: 4 },
    { state: 'Mizoram', avgRisk: 70, incidents: 6 },
    { state: 'Nagaland', avgRisk: 52, incidents: 3 },
    { state: 'Arunachal Pradesh', avgRisk: 65, incidents: 5 },
    { state: 'Tripura', avgRisk: 44, incidents: 2 },
    { state: 'Sikkim', avgRisk: 61, incidents: 3 },
  ],
  accessibilityByState: [
    { state: 'Assam', score: 72 },
    { state: 'Manipur', score: 56 },
    { state: 'Meghalaya', score: 64 },
    { state: 'Mizoram', score: 49 },
    { state: 'Nagaland', score: 60 },
    { state: 'Arunachal Pradesh', score: 42 },
    { state: 'Tripura', score: 66 },
    { state: 'Sikkim', score: 58 },
  ],
};

// ---------- HELPERS ----------
export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find(l => l.id === id);
}

export function getVehicle(id: string): Vehicle | undefined {
  return VEHICLES.find(v => v.id === id);
}

export function getWarehouse(id: string): Warehouse | undefined {
  return WAREHOUSES.find(w => w.id === id);
}

export function getHospital(id: string): Hospital | undefined {
  return HOSPITALS.find(h => h.id === id);
}

export function getRoadSegment(id: string): RoadSegment | undefined {
  return ROAD_SEGMENTS.find(r => r.id === id);
}

// Cargo types for dropdowns
export const CARGO_TYPES = [
  'Medical Supplies', 'Emergency Medicine', 'Food & Rations', 'Water',
  'Fuel', 'Emergency Kits', 'Disaster Relief', 'Construction Materials',
  'Vaccines', 'Water Purification',
];

// Mission types for emergency
export const MISSION_TYPES = [
  'Medical', 'Food', 'Water', 'Fuel', 'Emergency Equipment', 'Disaster Relief',
];

// NER States
export const NER_STATES = [
  'Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Sikkim', 'Tripura',
];
