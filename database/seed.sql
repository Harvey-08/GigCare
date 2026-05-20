-- GigCare Consolidated Seed Data
-- Run this after schema.sql to populate the demo environment.

-- 1. CITIES (Supported Operational Zones)
INSERT INTO cities (city_id, city_name, state, climate_zone, lat_min, lat_max, lon_min, lon_max, centroid_lat, centroid_lon, primary_trigger)
VALUES
  ('BLR', 'Bengaluru', 'Karnataka', 'tropical_savanna', 12.834, 13.139, 77.461, 77.782, 12.9716, 77.5946, 'HEAVY_RAIN'),
  ('MUM', 'Mumbai', 'Maharashtra', 'tropical_coastal', 18.893, 19.268, 72.776, 73.062, 19.0760, 72.8777, 'HEAVY_RAIN'),
  ('DEL', 'Delhi NCR', 'Delhi', 'humid_subtropical', 28.404, 28.883, 76.838, 77.350, 28.6139, 77.2090, 'EXTREME_HEAT'),
  ('CHN', 'Chennai', 'Tamil Nadu', 'tropical_coastal', 12.900, 13.230, 80.100, 80.330, 13.0827, 80.2707, 'HEAVY_RAIN'),
  ('HYD', 'Hyderabad', 'Telangana', 'semi_arid_tropical', 17.200, 17.590, 78.268, 78.618, 17.3850, 78.4867, 'EXTREME_HEAT'),
  ('PUN', 'Pune', 'Maharashtra', 'tropical_savanna', 18.430, 18.620, 73.736, 74.000, 18.5204, 73.8567, 'HEAVY_RAIN'),
  ('KOL', 'Kolkata', 'West Bengal', 'humid_subtropical', 22.430, 22.660, 88.248, 88.468, 22.5726, 88.3639, 'HEAVY_RAIN'),
  ('AMD', 'Ahmedabad', 'Gujarat', 'semi_arid', 22.924, 23.122, 72.470, 72.714, 23.0225, 72.5714, 'EXTREME_HEAT'),
  ('JAI', 'Jaipur', 'Rajasthan', 'arid', 26.778, 27.050, 75.660, 75.940, 26.9124, 75.7873, 'EXTREME_HEAT'),
  ('KOC', 'Kochi', 'Kerala', 'tropical_rainforest', 9.898, 10.098, 76.200, 76.380, 9.9312, 76.2673, 'HEAVY_RAIN');

-- 2. ZONES (Bengaluru zones)
INSERT INTO zones (zone_id, name, city, city_id, zone_risk_score, zone_risk_level, flood_prone, lat, lon)
VALUES
  ('zone_01', 'Koramangala', 'Bengaluru', 'BLR', 0.85, 'LOW', FALSE, 12.9352, 77.6245),
  ('zone_02', 'Whitefield', 'Bengaluru', 'BLR', 1.60, 'HIGH', TRUE, 12.9698, 77.7499),
  ('zone_03', 'Indiranagar', 'Bengaluru', 'BLR', 1.00, 'MEDIUM', FALSE, 12.9716, 77.6412);

-- 3. DEMO PROFILES (Admins and Workers)
INSERT INTO profiles (id, full_name, email, phone, role, platform, zone_id, city_id, trust_score)
VALUES
  ('adm-001', 'GigCare Admin', 'admin@gigcare.dev', '+919876543210', 'admin', NULL, NULL, NULL, 1.0),
  ('w-001', 'Priya Sharma', 'priya@demo.com', '+919876543211', 'worker', 'ZOMATO', 'zone_02', 'BLR', 0.95),
  ('w-002', 'Raj Kumar', 'raj@demo.com', '+919876543212', 'worker', 'SWIGGY', 'zone_01', 'BLR', 0.88);

-- 4. ACTIVE POLICIES
INSERT INTO policies (id, user_id, coverage_tier, premium_paid, max_payout, week_start, week_end, status)
VALUES
  ('pol-001', 'w-001', 'STANDARD', 162, 1200, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE'),
  ('pol-002', 'w-002', 'STANDARD', 120, 1000, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE');

-- 5. TRIGGER EVENTS (Active)
INSERT INTO trigger_events (event_id, zone_id, city_id, trigger_type, trigger_value, severity_factor, started_at, event_status)
VALUES
  ('ev-001', 'zone_02', 'BLR', 'HEAVY_RAIN', 68.5, 1.3, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'ACTIVE');

-- 6. CLAIMS
INSERT INTO claims (claim_id, policy_id, user_id, city_id, trigger_event_id, trigger_type, trigger_value, disruption_start, disruption_hours, status)
VALUES
  ('clm-001', 'pol-001', 'w-001', 'BLR', 'ev-001', 'HEAVY_RAIN', 68.5, CURRENT_TIMESTAMP - INTERVAL '2 hours', 1.5, 'PAID');
