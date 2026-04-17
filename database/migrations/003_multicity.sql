-- Phase 3 multi-city support.
-- Additive only: extends the Phase 2 schema without changing existing tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS city_id VARCHAR(5),
  ADD COLUMN IF NOT EXISTS grid_row INTEGER,
  ADD COLUMN IF NOT EXISTS grid_col INTEGER,
  ADD COLUMN IF NOT EXISTS centroid_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS centroid_lon DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS climate_zone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS rain_risk_factor FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS heat_risk_factor FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS last_risk_computed TIMESTAMP,
  ADD COLUMN IF NOT EXISTS historical_trigger_days_365 INTEGER DEFAULT 0;

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS city_id VARCHAR(5),
  ADD COLUMN IF NOT EXISTS location_mode VARCHAR(20) DEFAULT 'SUPPORTED_CITY',
  ADD COLUMN IF NOT EXISTS district VARCHAR(120),
  ADD COLUMN IF NOT EXISTS state VARCHAR(120),
  ADD COLUMN IF NOT EXISTS engagement_days_this_fy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multi_platform BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ss_code_eligible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS eligibility_last_checked TIMESTAMP,
  ADD COLUMN IF NOT EXISTS upi_vpa VARCHAR(120);

ALTER TABLE trigger_events
  ADD COLUMN IF NOT EXISTS city_id VARCHAR(5);

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS city_id VARCHAR(5),
  ADD COLUMN IF NOT EXISTS razorpay_payout_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payout_initiated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS cities (
  city_id VARCHAR(5) PRIMARY KEY,
  city_name VARCHAR(50) NOT NULL,
  state VARCHAR(50),
  climate_zone VARCHAR(30),
  lat_min FLOAT,
  lat_max FLOAT,
  lon_min FLOAT,
  lon_max FLOAT,
  centroid_lat FLOAT,
  centroid_lon FLOAT,
  primary_trigger VARCHAR(30),
  active_workers_estimate INTEGER,
  zomato_active BOOLEAN DEFAULT TRUE,
  swiggy_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO cities (
  city_id,
  city_name,
  state,
  climate_zone,
  lat_min,
  lat_max,
  lon_min,
  lon_max,
  centroid_lat,
  centroid_lon,
  primary_trigger,
  active_workers_estimate,
  zomato_active,
  swiggy_active
)
VALUES
  ('BLR', 'Bengaluru', 'Karnataka', 'tropical_savanna', 12.834, 13.139, 77.461, 77.782, 12.9716, 77.5946, 'HEAVY_RAIN', 80000, TRUE, TRUE),
  ('MUM', 'Mumbai', 'Maharashtra', 'tropical_coastal', 18.893, 19.268, 72.776, 73.062, 19.0760, 72.8777, 'HEAVY_RAIN', 120000, TRUE, TRUE),
  ('DEL', 'Delhi NCR', 'Delhi', 'humid_subtropical', 28.404, 28.883, 76.838, 77.350, 28.6139, 77.2090, 'EXTREME_HEAT', 150000, TRUE, TRUE),
  ('CHN', 'Chennai', 'Tamil Nadu', 'tropical_coastal', 12.900, 13.230, 80.100, 80.330, 13.0827, 80.2707, 'HEAVY_RAIN', 60000, TRUE, TRUE),
  ('HYD', 'Hyderabad', 'Telangana', 'semi_arid_tropical', 17.200, 17.590, 78.268, 78.618, 17.3850, 78.4867, 'HEAVY_RAIN', 55000, TRUE, TRUE),
  ('PUN', 'Pune', 'Maharashtra', 'tropical_savanna', 18.430, 18.620, 73.736, 74.000, 18.5204, 73.8567, 'HEAVY_RAIN', 45000, TRUE, TRUE),
  ('KOL', 'Kolkata', 'West Bengal', 'humid_subtropical', 22.430, 22.660, 88.248, 88.468, 22.5726, 88.3639, 'HEAVY_RAIN', 50000, TRUE, TRUE),
  ('AMD', 'Ahmedabad', 'Gujarat', 'semi_arid', 22.924, 23.122, 72.470, 72.714, 23.0225, 72.5714, 'EXTREME_HEAT', 30000, TRUE, TRUE),
  ('JAI', 'Jaipur', 'Rajasthan', 'arid', 26.778, 27.050, 75.660, 75.940, 26.9124, 75.7873, 'EXTREME_HEAT', 20000, TRUE, TRUE),
  ('KOC', 'Kochi', 'Kerala', 'tropical_rainforest', 9.898, 10.098, 76.200, 76.380, 9.9312, 76.2673, 'HEAVY_RAIN', 15000, TRUE, TRUE)
ON CONFLICT (city_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS zone_weekly_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(50) REFERENCES zones(zone_id),
  city_id VARCHAR(5),
  week_start DATE NOT NULL,
  active_policies INTEGER DEFAULT 0,
  premium_collected DECIMAL(12,2) DEFAULT 0,
  claims_paid DECIMAL(12,2) DEFAULT 0,
  loss_ratio FLOAT,
  trigger_events INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_city_id ON zones(city_id);
CREATE INDEX IF NOT EXISTS idx_zones_grid ON zones(city_id, grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_zones_centroid ON zones(centroid_lat, centroid_lon);
CREATE INDEX IF NOT EXISTS idx_workers_city_id ON workers(city_id);
CREATE INDEX IF NOT EXISTS idx_claims_city_id ON claims(city_id);
CREATE INDEX IF NOT EXISTS idx_trigger_events_city_id ON trigger_events(city_id);
