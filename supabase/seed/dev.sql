-- =============================================================================
-- AuraNER / NER-RouteAI — Development Reference Seed
-- Coverage: All 8 Northeast States (Assam, Arunachal, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DEFAULT ORGANIZATION
-- -----------------------------------------------------------------------------
INSERT INTO organizations (id, name, code, type)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'North Eastern Regional Logistics & Emergency Command', 'NER-CMD-01', 'government')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. REFERENCE LOCATIONS (ALL 8 STATES)
-- -----------------------------------------------------------------------------
INSERT INTO locations (id, name, state, district, type, elevation_meters, population, coordinates, accessibility_tier, road_access_quality)
VALUES
  -- ASSAM
  ('b0000000-0000-0000-0000-000000000001', 'Guwahati', 'Assam', 'Kamrup Metropolitan', 'city', 55, 957352, ST_SetSRID(ST_MakePoint(91.7362, 26.1445), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000002', 'Tezpur', 'Assam', 'Sonitpur', 'town', 79, 58851, ST_SetSRID(ST_MakePoint(92.8004, 26.6338), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000003', 'Silchar', 'Assam', 'Cachar', 'city', 20, 228985, ST_SetSRID(ST_MakePoint(92.7789, 24.8333), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000004', 'Jorhat', 'Assam', 'Jorhat', 'city', 116, 153889, ST_SetSRID(ST_MakePoint(94.2037, 26.7509), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000005', 'Dibrugarh', 'Assam', 'Dibrugarh', 'city', 108, 154296, ST_SetSRID(ST_MakePoint(94.9120, 27.4728), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000006', 'North Lakhimpur', 'Assam', 'Lakhimpur', 'town', 101, 56500, ST_SetSRID(ST_MakePoint(94.1011, 27.2377), 4326), 'MEDIUM', 'ALL_WEATHER'),

  -- ARUNACHAL PRADESH
  ('b0000000-0000-0000-0000-000000000007', 'Itanagar', 'Arunachal Pradesh', 'Papum Pare', 'city', 360, 44971, ST_SetSRID(ST_MakePoint(93.6053, 27.0844), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000008', 'Bomdila', 'Arunachal Pradesh', 'West Kameng', 'town', 2415, 8500, ST_SetSRID(ST_MakePoint(92.4178, 27.2647), 4326), 'LOW', 'RESTRICTED'),
  ('b0000000-0000-0000-0000-000000000009', 'Tawang', 'Arunachal Pradesh', 'Tawang', 'town', 3048, 11200, ST_SetSRID(ST_MakePoint(91.8667, 27.5833), 4326), 'ISOLATED', 'RESTRICTED'),
  ('b0000000-0000-0000-0000-000000000010', 'Pasighat', 'Arunachal Pradesh', 'East Siang', 'town', 153, 22161, ST_SetSRID(ST_MakePoint(95.3335, 28.0670), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000011', 'Ziro', 'Arunachal Pradesh', 'Lower Subansiri', 'town', 1554, 8000, ST_SetSRID(ST_MakePoint(93.8333, 27.5500), 4326), 'LOW', 'FAIR_WEATHER'),

  -- MANIPUR
  ('b0000000-0000-0000-0000-000000000012', 'Imphal', 'Manipur', 'Imphal West', 'city', 786, 414288, ST_SetSRID(ST_MakePoint(93.9368, 24.8170), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000013', 'Churachandpur', 'Manipur', 'Churachandpur', 'town', 920, 56630, ST_SetSRID(ST_MakePoint(93.6833, 24.3333), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000014', 'Senapati', 'Manipur', 'Senapati', 'town', 1450, 42800, ST_SetSRID(ST_MakePoint(93.9667, 25.2667), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000015', 'Karong', 'Manipur', 'Senapati', 'village', 1680, 3200, ST_SetSRID(ST_MakePoint(94.1000, 25.1500), 4326), 'ISOLATED', '4X4_ONLY'),

  -- MEGHALAYA
  ('b0000000-0000-0000-0000-000000000016', 'Shillong', 'Meghalaya', 'East Khasi Hills', 'city', 1496, 354759, ST_SetSRID(ST_MakePoint(91.8933, 25.5788), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000017', 'Tura', 'Meghalaya', 'West Garo Hills', 'town', 325, 72104, ST_SetSRID(ST_MakePoint(90.2167, 25.5167), 4326), 'MEDIUM', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000018', 'Nongstoin', 'Meghalaya', 'West Khasi Hills', 'town', 1300, 12000, ST_SetSRID(ST_MakePoint(91.2667, 25.5167), 4326), 'LOW', 'FAIR_WEATHER'),
  ('b0000000-0000-0000-0000-000000000019', 'Cherrapunji', 'Meghalaya', 'East Khasi Hills', 'town', 1484, 11722, ST_SetSRID(ST_MakePoint(91.7333, 25.2833), 4326), 'LOW', 'ALL_WEATHER'),

  -- MIZORAM
  ('b0000000-0000-0000-0000-000000000020', 'Aizawl', 'Mizoram', 'Aizawl', 'city', 1132, 293416, ST_SetSRID(ST_MakePoint(92.7173, 23.7307), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000021', 'Lunglei', 'Mizoram', 'Lunglei', 'town', 1133, 58986, ST_SetSRID(ST_MakePoint(92.7333, 22.8833), 4326), 'LOW', 'FAIR_WEATHER'),
  ('b0000000-0000-0000-0000-000000000022', 'Champhai', 'Mizoram', 'Champhai', 'town', 1678, 15000, ST_SetSRID(ST_MakePoint(93.3307, 23.4608), 4326), 'LOW', 'FAIR_WEATHER'),

  -- NAGALAND
  ('b0000000-0000-0000-0000-000000000023', 'Kohima', 'Nagaland', 'Kohima', 'city', 1444, 267988, ST_SetSRID(ST_MakePoint(94.1077, 25.6701), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000024', 'Dimapur', 'Nagaland', 'Dimapur', 'city', 232, 422032, ST_SetSRID(ST_MakePoint(93.7258, 25.9069), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000025', 'Mokokchung', 'Nagaland', 'Mokokchung', 'town', 1325, 38474, ST_SetSRID(ST_MakePoint(94.5198, 26.3208), 4326), 'MEDIUM', 'ALL_WEATHER'),

  -- TRIPURA
  ('b0000000-0000-0000-0000-000000000026', 'Agartala', 'Tripura', 'West Tripura', 'city', 13, 400004, ST_SetSRID(ST_MakePoint(91.2868, 23.8315), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000027', 'Dharmanagar', 'Tripura', 'North Tripura', 'town', 21, 40592, ST_SetSRID(ST_MakePoint(92.1667, 24.3833), 4326), 'MEDIUM', 'ALL_WEATHER'),

  -- SIKKIM
  ('b0000000-0000-0000-0000-000000000028', 'Gangtok', 'Sikkim', 'East Sikkim', 'city', 1650, 100286, ST_SetSRID(ST_MakePoint(88.6065, 27.3389), 4326), 'HIGH', 'ALL_WEATHER'),
  ('b0000000-0000-0000-0000-000000000029', 'Mangan', 'Sikkim', 'North Sikkim', 'town', 956, 4644, ST_SetSRID(ST_MakePoint(88.5333, 27.5000), 4326), 'LOW', 'RESTRICTED')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. REFERENCE VEHICLE FLEET WITH TERRAIN CAPABILITIES
-- -----------------------------------------------------------------------------
INSERT INTO vehicles (id, organization_id, registration_number, type, capacity_kg, volume_m3, fuel_type, terrain_capabilities, max_gradient_pct, max_width_meters, water_crossing_capable, status, fuel_pct)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'AS-01-AX-1010', 'UTILITY_4X4', 1500.0, 5.0, 'DIESEL', ARRAY['PLAIN', 'HILLY', 'MOUNTAINOUS', 'OFFROAD'], 35, 2.0, TRUE, 'AVAILABLE', 92),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'AS-01-BX-2020', 'LIGHT_VAN', 1200.0, 6.5, 'DIESEL', ARRAY['PLAIN', 'HILLY'], 15, 2.1, FALSE, 'AVAILABLE', 88),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'MN-01-TX-3030', 'MEDIUM_TRUCK', 7500.0, 24.0, 'DIESEL', ARRAY['PLAIN', 'HILLY'], 20, 2.5, FALSE, 'AVAILABLE', 80),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'ML-05-HX-4040', 'HEAVY_TRUCK', 16000.0, 48.0, 'DIESEL', ARRAY['PLAIN'], 12, 2.6, FALSE, 'AVAILABLE', 75),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'AR-01-EX-5050', 'AMBULANCE', 800.0, 4.0, 'DIESEL', ARRAY['PLAIN', 'HILLY', 'MOUNTAINOUS'], 28, 2.0, TRUE, 'AVAILABLE', 96),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'MZ-01-RX-6060', 'REFRIGERATED_TRUCK', 4500.0, 16.0, 'DIESEL', ARRAY['PLAIN', 'HILLY'], 18, 2.4, FALSE, 'AVAILABLE', 84),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'NL-07-OX-7070', 'OFFROAD_VEHICLE', 2000.0, 7.0, 'DIESEL', ARRAY['PLAIN', 'HILLY', 'MOUNTAINOUS', 'OFFROAD'], 40, 2.2, TRUE, 'AVAILABLE', 90)
ON CONFLICT (registration_number) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. EMERGENCY SAFE LOCATIONS
-- -----------------------------------------------------------------------------
INSERT INTO safe_locations (name, type, state, coordinates, contact_number, capacity_description)
VALUES
  ('Guwahati Medical College Safe Staging', 'HOSPITAL', 'Assam', ST_SetSRID(ST_MakePoint(91.7712, 26.1550), 4326), '+91-361-2130200', 'Emergency trauma unit, heavy vehicle parking, fuel reserves'),
  ('Tezpur Police Post & Relief Depot', 'POLICE_POST', 'Assam', ST_SetSRID(ST_MakePoint(92.7950, 26.6310), 4326), '+91-3712-220022', 'Armed security, 20 vehicle secure bay, first aid'),
  ('Dimapur Highway Security Station', 'POLICE_POST', 'Nagaland', ST_SetSRID(ST_MakePoint(93.7310, 25.9120), 4326), '+91-3862-230100', 'Highway patrol depot, vehicle recovery crane'),
  ('Shillong Civil Hospital Safe Zone', 'HOSPITAL', 'Meghalaya', ST_SetSRID(ST_MakePoint(91.8900, 25.5750), 4326), '+91-364-2224100', 'Highland medical depot, power backup, oxygen supplies'),
  ('Maram Military Checkpoint & Relief Camp', 'RELIEF_CAMP', 'Manipur', ST_SetSRID(ST_MakePoint(94.0150, 25.1850), 4326), '+91-3871-222333', 'Landslide recovery base, emergency communications, shelter'),
  ('Bomdila District Emergency Center', 'RELIEF_CAMP', 'Arunachal Pradesh', ST_SetSRID(ST_MakePoint(92.4200, 27.2680), 4326), '+91-3782-222055', 'Mountain rescue hub, satellite comms, diesel cache');
