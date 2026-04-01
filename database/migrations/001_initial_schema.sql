-- GigCare Initial Schema
-- PostgreSQL 15
-- This is the foundation. Run this FIRST.

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE platform_enum AS ENUM ('ZOMATO', 'SWIGGY', 'ZEPTO', 'AMAZON', 'OTHER');
CREATE TYPE bike_type_enum AS ENUM ('TWO_WHEELER', 'E_BIKE', 'BICYCLE');
CREATE TYPE shift_enum AS ENUM ('MORNING', 'EVENING', 'SPLIT');
CREATE TYPE coverage_tier_enum AS ENUM ('SEED', 'STANDARD', 'PREMIUM');
CREATE TYPE trigger_type_enum AS ENUM ('HEAVY_RAIN', 'EXTREME_HEAT', 'POOR_AQI', 'CURFEW', 'APP_OUTAGE');
CREATE TYPE claim_status_enum AS ENUM ('AUTO_CREATED', 'TRUST_EVALUATED', 'APPROVED', 'PARTIAL', 'FLAGGED', 'PAID', 'DENIED', 'CLOSED');
CREATE TYPE policy_status_enum AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE zone_risk_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE zones (
  zone_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  zone_risk_score FLOAT DEFAULT 1.0,
  zone_risk_level zone_risk_enum DEFAULT 'MEDIUM',
  flood_prone BOOLEAN DEFAULT FALSE,
  lat FLOAT,
  lon FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workers (
  worker_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  platform platform_enum NOT NULL,
  zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
  bike_type bike_type_enum,
  avg_daily_income FLOAT DEFAULT 650.0,
  avg_daily_orders INT DEFAULT 25,
  shifts shift_enum[] DEFAULT ARRAY['EVENING'::shift_enum],
  trust_score FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
  device_id VARCHAR(100) PRIMARY KEY,
  worker_id VARCHAR(100) NOT NULL REFERENCES workers(worker_id),
  fingerprint_hash VARCHAR(255),
  rooted_flag BOOLEAN DEFAULT FALSE,
  shared_account_count INT DEFAULT 1,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE premium_quotes (
  quote_id VARCHAR(100) PRIMARY KEY,
  worker_id VARCHAR(100) NOT NULL REFERENCES workers(worker_id),
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

CREATE TABLE policies (
  policy_id VARCHAR(100) PRIMARY KEY,
  worker_id VARCHAR(100) NOT NULL REFERENCES workers(worker_id),
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

CREATE TABLE trigger_events (
  event_id VARCHAR(100) PRIMARY KEY,
  zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
  trigger_type trigger_type_enum NOT NULL,
  trigger_value FLOAT NOT NULL,
  severity_factor FLOAT DEFAULT 1.0,
  peak_multiplier FLOAT DEFAULT 1.0,
  order_drop_percentage FLOAT,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  claims_generated INT DEFAULT 0,
  payout_dispatched INT DEFAULT 0,
  event_status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
  claim_id VARCHAR(100) PRIMARY KEY,
  policy_id VARCHAR(100) NOT NULL REFERENCES policies(policy_id),
  worker_id VARCHAR(100) NOT NULL REFERENCES workers(worker_id),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
-- =====================================================
-- ADMIN TABLES
-- =====================================================

CREATE TABLE admins (
  admin_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(50) DEFAULT 'ADMIN',
  permissions TEXT[] DEFAULT ARRAY['read', 'write', 'admin'],
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- INDEXES
-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_workers_zone_id ON workers(zone_id);
CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_workers_trust_score ON workers(trust_score);

CREATE INDEX idx_policies_worker_id ON policies(worker_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_week_start ON policies(week_start);

CREATE INDEX idx_claims_worker_id ON claims(worker_id);
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_trust_score ON claims(trust_score);
CREATE INDEX idx_claims_trigger_type ON claims(trigger_type);
CREATE INDEX idx_claims_created_at ON claims(created_at);

CREATE INDEX idx_trigger_events_zone_id ON trigger_events(zone_id);
CREATE INDEX idx_trigger_events_trigger_type ON trigger_events(trigger_type);
CREATE INDEX idx_trigger_events_created_at ON trigger_events(created_at);

CREATE INDEX idx_location_signals_claim_id ON location_signals(claim_id);
CREATE INDEX idx_location_signals_device_id ON location_signals(device_id);

CREATE INDEX idx_premium_quotes_worker_id ON premium_quotes(worker_id);
CREATE INDEX idx_premium_quotes_zone_id ON premium_quotes(zone_id);

-- =====================================================
-- DONE
-- =====================================================
