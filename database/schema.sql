-- GigCare Consolidated Schema
-- This file defines the full database structure for easy setup in Supabase.

-- 1. ENUMS
CREATE TYPE platform_enum AS ENUM ('ZOMATO', 'SWIGGY', 'ZEPTO', 'AMAZON', 'OTHER');
CREATE TYPE bike_type_enum AS ENUM ('TWO_WHEELER', 'E_BIKE', 'BICYCLE');
CREATE TYPE shift_enum AS ENUM ('MORNING', 'EVENING', 'SPLIT');
CREATE TYPE coverage_tier_enum AS ENUM ('SEED', 'STANDARD', 'PREMIUM');
CREATE TYPE trigger_type_enum AS ENUM ('HEAVY_RAIN', 'EXTREME_HEAT', 'POOR_AQI', 'CURFEW', 'APP_OUTAGE');
CREATE TYPE claim_status_enum AS ENUM ('AUTO_CREATED', 'TRUST_EVALUATED', 'APPROVED', 'PARTIAL', 'FLAGGED', 'PAID', 'DENIED', 'CLOSED');
CREATE TYPE policy_status_enum AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE zone_risk_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- 2. CORE TABLES

-- Cities 
CREATE TABLE cities (
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

-- Zones
CREATE TABLE zones (
  zone_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  city_id VARCHAR(5) REFERENCES cities(city_id),
  zone_risk_score FLOAT DEFAULT 1.0,
  zone_risk_level zone_risk_enum DEFAULT 'MEDIUM',
  flood_prone BOOLEAN DEFAULT FALSE,
  lat FLOAT,
  lon FLOAT,
  grid_row INTEGER,
  grid_col INTEGER,
  centroid_lat DECIMAL(10,7),
  centroid_lon DECIMAL(10,7),
  climate_zone VARCHAR(30),
  rain_risk_factor FLOAT DEFAULT 1.0,
  heat_risk_factor FLOAT DEFAULT 1.0,
  last_risk_computed TIMESTAMP,
  historical_trigger_days_365 INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unified Profiles (Workers & Admins)
CREATE TABLE profiles (
  id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) UNIQUE,
  role VARCHAR(50) DEFAULT 'worker',
  platform platform_enum,
  zone_id VARCHAR(50) REFERENCES zones(zone_id),
  city_id VARCHAR(5) REFERENCES cities(city_id),
  bike_type bike_type_enum,
  avg_daily_income FLOAT DEFAULT 650.0,
  avg_daily_orders INT DEFAULT 25,
  shifts shift_enum[] DEFAULT ARRAY['EVENING'::shift_enum],
  trust_score FLOAT DEFAULT 1.0,
  location_mode VARCHAR(20) DEFAULT 'SUPPORTED_CITY',
  district VARCHAR(120),
  state VARCHAR(120),
  last_known_latitude FLOAT,
  last_known_longitude FLOAT,
  location_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  engagement_days_this_fy INTEGER DEFAULT 0,
  multi_platform BOOLEAN DEFAULT FALSE,
  ss_code_eligible BOOLEAN DEFAULT FALSE,
  eligibility_last_checked TIMESTAMP,
  upi_vpa VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices
CREATE TABLE devices (
  device_id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id VARCHAR(100) NOT NULL REFERENCES profiles(id),
  fingerprint_hash VARCHAR(255),
  rooted_flag BOOLEAN DEFAULT FALSE,
  shared_account_count INT DEFAULT 1,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Premium Quotes
CREATE TABLE premium_quotes (
  quote_id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(id),
  zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  premium_rupees INT NOT NULL,
  zone_risk_factor FLOAT,
  forecast_risk_factor FLOAT,
  trust_penalty FLOAT,
  expires_at TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies
CREATE TABLE policies (
  id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(id),
  worker_id VARCHAR(100) REFERENCES profiles(id), -- Alias for code compatibility
  quote_id VARCHAR(100) REFERENCES premium_quotes(quote_id),
  coverage_tier coverage_tier_enum NOT NULL,
  premium_paid INT NOT NULL,
  max_payout INT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status policy_status_enum DEFAULT 'PENDING_PAYMENT',
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger Events
CREATE TABLE trigger_events (
  event_id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
  city_id VARCHAR(5) REFERENCES cities(city_id),
  trigger_type trigger_type_enum NOT NULL,
  trigger_value FLOAT NOT NULL,
  severity_factor FLOAT DEFAULT 1.0,
  peak_multiplier FLOAT DEFAULT 1.0,
  order_drop_percentage FLOAT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  claims_generated INT DEFAULT 0,
  payout_dispatched INT DEFAULT 0,
  event_status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims
CREATE TABLE claims (
  claim_id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(100) NOT NULL REFERENCES policies(id),
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(id),
  worker_id VARCHAR(100) REFERENCES profiles(id), -- Alias for code compatibility
  city_id VARCHAR(5) REFERENCES cities(city_id),
  trigger_event_id VARCHAR(100) REFERENCES trigger_events(event_id),
  trigger_type trigger_type_enum NOT NULL,
  trigger_value FLOAT,
  disruption_start TIMESTAMP NOT NULL,
  disruption_end TIMESTAMP,
  disruption_hours FLOAT,
  raw_payout INT,
  final_payout INT,
  trust_score FLOAT DEFAULT 1.0,
  status claim_status_enum DEFAULT 'AUTO_CREATED',
  fraud_reason VARCHAR(500),
  razorpay_payout_id VARCHAR(255),
  payout_initiated_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location Signals
CREATE TABLE location_signals (
  signal_id VARCHAR(100) PRIMARY KEY,
  claim_id VARCHAR(100) NOT NULL REFERENCES claims(claim_id),
  device_id VARCHAR(100) REFERENCES devices(device_id),
  gps_lat FLOAT,
  gps_lon FLOAT,
  gps_accuracy FLOAT,
  cell_tower_ids TEXT[],
  wifi_ssids TEXT[],
  accelerometer_mag FLOAT,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent Records 
CREATE TABLE consent_records (
  consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id VARCHAR(100) REFERENCES profiles(id),
  consent_type VARCHAR(30) NOT NULL,
  consent_granted BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL,
  ip_address INET,
  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  UNIQUE(worker_id, consent_type)
);

-- 3. INDEXES
CREATE INDEX idx_profiles_zone_id ON profiles(zone_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);

CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_policies_status ON policies(status);

CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);

CREATE INDEX idx_trigger_events_zone_id ON trigger_events(zone_id);
CREATE INDEX idx_zones_city_id ON zones(city_id);
