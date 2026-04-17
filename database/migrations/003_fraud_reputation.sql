-- 003_fraud_reputation.sql
-- Persistent fraud reputation and identity linkage tables.

CREATE TABLE IF NOT EXISTS fraud_reputation (
    worker_id UUID PRIMARY KEY,
    risk_score NUMERIC(5,4) NOT NULL DEFAULT 0,
    event_count INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    denied_count INTEGER NOT NULL DEFAULT 0,
    last_device_fingerprint TEXT,
    last_ip_address TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_identity_links (
    worker_id UUID NOT NULL,
    identity_type TEXT NOT NULL,
    identity_value TEXT NOT NULL,
    link_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (worker_id, identity_type, identity_value)
);

CREATE INDEX IF NOT EXISTS idx_fraud_reputation_risk_score
    ON fraud_reputation (risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_identity_type_value
    ON fraud_identity_links (identity_type, identity_value);

CREATE INDEX IF NOT EXISTS idx_fraud_identity_last_seen
    ON fraud_identity_links (last_seen_at DESC);
