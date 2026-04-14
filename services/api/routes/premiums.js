// services/api/routes/premiums.js
const express = require('express');
const axios = require('axios');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../models/supabase');

const router = express.Router();

const ML_PREMIUM_URL = process.env.ML_PREMIUM_SERVICE_URL || 'http://localhost:5001';

// =====================================================
// POST /api/premiums/calculate
// =====================================================
router.post('/calculate', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id } = req.user;
    const { zone_id, week_start } = req.body;

    if (!zone_id) {
      return res.status(422).json({ error: 'Missing required field: zone_id', code: 'MISSING_FIELDS' });
    }

    // Fetch profile
    const profile = req.user.profile;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Fetch zone
    const { data: zone } = await db.getZone(zone_id);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    // Call ML service or use fallback
    let premium;
    try {
      const mlResponse = await axios.post(`${ML_PREMIUM_URL}/predict-premium`, {
        zone_risk_score: zone.zone_risk_score,
        historical_rain_events: 5,
        forecast_rain_prob: 0.4,
        worker_experience_weeks: 12,
      }, { timeout: 3000 });
      premium = mlResponse.data.premium_rupees;
    } catch (mlError) {
      console.warn('ML service fallback');
      premium = Math.round(100 * zone.zone_risk_score);
    }

    const week_start_date = week_start ? new Date(week_start) : new Date();
    const week_end_date = new Date(week_start_date);
    week_end_date.setDate(week_end_date.getDate() + 6);

    // Create quote via Supabase
    const { data: quote, error: quoteError } = await supabase.from('premium_quotes').insert({
      user_id,
      zone_id,
      week_start: week_start_date.toISOString().split('T')[0],
      week_end: week_end_date.toISOString().split('T')[0],
      premium_rupees: premium,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }).select().single();

    if (quoteError) throw quoteError;

    res.json({
      data: {
        ...quote,
        zone_name: zone.name,
        coverage_tier: premium < 120 ? 'SEED' : premium < 180 ? 'STANDARD' : 'PREMIUM',
        max_payout: premium < 120 ? 600 : premium < 180 ? 1200 : 1800,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Premium calculation error:', err);
    res.status(500).json({ error: 'Premium calculation failed', code: 'PREMIUM_CALC_FAILED' });
  }
});

module.exports = router;
