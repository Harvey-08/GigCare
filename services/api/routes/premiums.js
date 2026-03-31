// services/api/routes/premiums.js
// Premium calculation endpoints - Person A

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ML SERVICE URL
const ML_PREMIUM_URL = process.env.ML_PREMIUM_SERVICE_URL || 'http://localhost:5001';

// =====================================================
// POST /api/premiums/calculate
// Calculate weekly premium for a worker in a zone
// =====================================================
router.post('/calculate', authMiddleware('WORKER'), async (req, res) => {
  try {
    const { worker_id } = req.user;
    const { zone_id, week_start } = req.body;

    if (!zone_id) {
      return res.status(422).json({
        error: 'Missing required field: zone_id',
        code: 'MISSING_FIELDS',
      });
    }

    // Fetch worker
    const workerRes = await db.getWorker(worker_id);
    if (workerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found', code: 'WORKER_NOT_FOUND' });
    }
    const worker = workerRes.rows[0];

    // Fetch zone
    const zoneRes = await db.getZone(zone_id);
    if (zoneRes.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }
    const zone = zoneRes.rows[0];

    // Call ML service for premium prediction
    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_PREMIUM_URL}/predict-premium`, {
        zone_risk_score: zone.zone_risk_score,
        historical_rain_events: 5,
        historical_heat_events: 2,
        forecast_rain_prob: 0.4,
        forecast_max_temp_c: 38,
        worker_experience_weeks: 12,
        past_claim_count: 0,
        past_fraud_flags: 0,
        past_claim_ratio: 0,
      });
    } catch (mlError) {
      console.warn('ML service error, using fallback formula:', mlError.message);
      // Fallback formula if ML service is down
      mlResponse = {
        data: {
          premium_rupees: Math.round(100 * zone.zone_risk_score),
          feature_importances: { zone_risk_score: 0.95 },
        },
      };
    }

    const premium = mlResponse.data.premium_rupees;

    // Create premium quote
    const quote_id = `quote-${uuidv4().substring(0, 8)}`;
    const week_start_date = week_start ? new Date(week_start) : new Date();
    const week_end_date = new Date(week_start_date);
    week_end_date.setDate(week_end_date.getDate() + 6);

    await db.query(
      `INSERT INTO premium_quotes (quote_id, worker_id, zone_id, week_start, week_end, premium_rupees, zone_risk_factor, forecast_risk_factor, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours')`,
      [
        quote_id,
        worker_id,
        zone_id,
        week_start_date,
        week_end_date,
        premium,
        zone.zone_risk_score,
        0.9,
      ]
    );

    res.json({
      data: {
        quote_id,
        worker_id,
        zone_id,
        zone_name: zone.name,
        zone_risk_level: zone.zone_risk_level,
        week_start: week_start_date.toISOString().split('T')[0],
        week_end: week_end_date.toISOString().split('T')[0],
        premium_rupees: premium,
        coverage_tier: premium < 120 ? 'SEED' : premium < 180 ? 'STANDARD' : 'PREMIUM',
        max_payout: premium < 120 ? 600 : premium < 180 ? 1200 : 1800,
        triggers_covered: ['HEAVY_RAIN', 'EXTREME_HEAT', 'POOR_AQI', 'CURFEW', 'APP_OUTAGE'],
        breakdown: {
          base_rate: 100,
          zone_multiplier: zone.zone_risk_score,
          forecast_multiplier: 0.9,
          trust_discount: 0,
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Premium calculation error:', err);
    res.status(500).json({
      error: 'Premium calculation failed',
      code: 'PREMIUM_CALC_FAILED',
    });
  }
});

module.exports = router;
