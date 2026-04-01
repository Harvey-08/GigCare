// services/api/models/db.js
// PostgreSQL client and query helpers - Person A
// Usage: const db = require('./models/db'); await db.query('SELECT * FROM workers WHERE id = $1', [id])

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// =====================================================
// QUERY HELPER
// =====================================================
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) console.log(`[SLOW QUERY ${duration}ms]`, text.substring(0, 50));
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// =====================================================
// TRANSACTION HELPER
// =====================================================
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// EXPORTED QUERIES (examples - expand as needed)
// =====================================================

// WORKERS
const getWorker = (id) => query('SELECT * FROM workers WHERE worker_id = $1', [id]);
const createWorker = (id, name, phone, platform, zone_id) =>
  query(
    'INSERT INTO workers (worker_id, name, phone, platform, zone_id, trust_score) VALUES ($1, $2, $3, $4, $5, 1.0) RETURNING *',
    [id, name, phone, platform, zone_id]
  );

// ZONES
const getZones = () => query('SELECT * FROM zones ORDER BY zone_risk_score ASC');
const getZone = (zone_id) => query('SELECT * FROM zones WHERE zone_id = $1', [zone_id]);

// POLICIES
const createPolicy = (policy_id, worker_id, quote_id, tier, premium, max_payout, week_start, week_end) =>
  query(
    `INSERT INTO policies (policy_id, worker_id, quote_id, coverage_tier, premium_paid, max_payout, week_start, week_end, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_PAYMENT') RETURNING *`,
    [policy_id, worker_id, quote_id, tier, premium, max_payout, week_start, week_end]
  );

const getPolicy = (policy_id) => query('SELECT * FROM policies WHERE policy_id = $1', [policy_id]);

const getPoliciesForWorker = (worker_id) =>
  query('SELECT * FROM policies WHERE worker_id = $1 ORDER BY created_at DESC', [worker_id]);

const activatePolicy = (policy_id, razorpay_payment_id) =>
  query('UPDATE policies SET status = $1, razorpay_payment_id = $2, updated_at = NOW() WHERE policy_id = $3 RETURNING *', [
    'ACTIVE',
    razorpay_payment_id,
    policy_id,
  ]);

// CLAIMS
const createClaim = (claim_id, policy_id, worker_id, event_id, trigger_type, trigger_value, hours, payout, trust_score, status) =>
  query(
    `INSERT INTO claims (claim_id, policy_id, worker_id, trigger_event_id, trigger_type, trigger_value, disruption_start, disruption_end, disruption_hours, raw_payout, final_payout, trust_score, status)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 hour', NOW(), $7, $8, $8, $9, $10) RETURNING *`,
    [claim_id, policy_id, worker_id, event_id, trigger_type, trigger_value, hours, payout, trust_score, status]
  );

const getClaim = (claim_id) => query('SELECT * FROM claims WHERE claim_id = $1', [claim_id]);

const getClaimsForWorker = (worker_id) =>
  query('SELECT * FROM claims WHERE worker_id = $1 ORDER BY created_at DESC', [worker_id]);

const getActivePoliciesInZone = (zone_id, current_date) =>
  query(
    'SELECT * FROM policies WHERE status = $1 AND week_start <= $2 AND week_end >= $2 AND worker_id IN (SELECT worker_id FROM workers WHERE zone_id = $3)',
    ['ACTIVE', current_date, zone_id]
  );

const updateClaimStatus = (claim_id, status, payout_id = null) =>
  query(
    'UPDATE claims SET status = $1, razorpay_payout_id = $2, updated_at = NOW() WHERE claim_id = $3 RETURNING *',
    [status, payout_id, claim_id]
  );

// TRIGGER EVENTS
const createTriggerEvent = (event_id, zone_id, trigger_type, trigger_value, severity, multiplier, dropped) =>
  query(
    `INSERT INTO trigger_events (event_id, zone_id, trigger_type, trigger_value, severity_factor, peak_multiplier, order_drop_percentage, started_at, ended_at, event_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '1 hour', 'ACTIVE') RETURNING *`,
    [event_id, zone_id, trigger_type, trigger_value, severity, multiplier, dropped]
  );

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  query,
  transaction,
  pool,
  // Workers
  getWorker,
  createWorker,
  // Zones
  getZones,
  getZone,
  // Policies
  createPolicy,
  getPolicy,
  getPoliciesForWorker,
  activatePolicy,
  // Claims
  createClaim,
  getClaim,
  getClaimsForWorker,
  getActivePoliciesInZone,
  updateClaimStatus,
  // Trigger Events
  createTriggerEvent,
};
