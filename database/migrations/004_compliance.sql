-- Phase 3 compliance support.
-- Adds SS Code and DPDP Act related fields and tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS engagement_days_this_fy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multi_platform BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ss_code_eligible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS eligibility_last_checked TIMESTAMP;

CREATE TABLE IF NOT EXISTS consent_records (
  consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id VARCHAR(100) REFERENCES workers(worker_id),
  consent_type VARCHAR(30) NOT NULL,
  consent_granted BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL,
  ip_address INET,
  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  UNIQUE(worker_id, consent_type)
);

CREATE OR REPLACE FUNCTION delete_old_location_signals()
RETURNS void AS $$
  DELETE FROM location_signals
  WHERE timestamp < NOW() - INTERVAL '90 days';
$$ LANGUAGE sql;
