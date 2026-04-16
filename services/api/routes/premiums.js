// services/api/routes/premiums.js
const express = require('express');
const axios = require('axios');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../models/supabase');
const { resolveUserLocation } = require('../utils/location-resolver');
const { computeZoneRiskScore } = require('../utils/risk-scorer');
const { applySeasonalGuard, checkEnrollmentLock, getBasePremiumForCity } = require('../utils/premium-calculator');

const router = express.Router();

const ML_PREMIUM_URL = process.env.ML_PREMIUM_SERVICE_URL || 'http://localhost:5001';

// =====================================================
// POST /api/premiums/calculate
// =====================================================
router.post('/calculate', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id } = req.user;
    const { zone_id, week_start, centroid_lat, centroid_lon } = req.body;

    if (!zone_id && (centroid_lat === undefined || centroid_lon === undefined)) {
      return res.status(422).json({ error: 'Missing required field: zone_id', code: 'MISSING_FIELDS' });
    }

    // Fetch profile
    const profile = req.user.profile;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Fetch zone, resolving from live location when coordinates are available.
    let resolvedLocation = null;
    let zone = null;

    if (centroid_lat !== undefined && centroid_lon !== undefined) {
      resolvedLocation = await resolveUserLocation(Number(centroid_lat), Number(centroid_lon));
      const resolvedZoneId = resolvedLocation.zone_id || zone_id;
      const zoneResult = await db.getZone(resolvedZoneId);
      zone = zoneResult.data || null;
    } else {
      const zoneResult = await db.getZone(zone_id);
      zone = zoneResult.data || null;
    }

    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const zoneCentroidLat = Number(zone.centroid_lat || zone.lat || centroid_lat || 0);
    const zoneCentroidLon = Number(zone.centroid_lon || zone.lon || centroid_lon || 0);
    const cityId = zone.city_id || resolvedLocation?.city_id || zone.city?.slice(0, 3)?.toUpperCase() || 'BLR';

    const lockCheck = await checkEnrollmentLock(zoneCentroidLat, zoneCentroidLon);
    if (lockCheck.locked) {
      return res.status(423).json({
        error: lockCheck.reason,
        code: 'ENROLLMENT_LOCKED',
        data: lockCheck,
      });
    }

    const zoneRiskScore = zone.zone_risk_score && zone.last_risk_computed
      ? zone.zone_risk_score
      : await computeZoneRiskScore(zone.zone_id, zoneCentroidLat, zoneCentroidLon, resolvedLocation?.cityConfig || null);

    // Call ML service or use fallback
    let premium;
    try {
      const mlResponse = await axios.post(`${ML_PREMIUM_URL}/predict-premium`, {
        centroid_lat: zoneCentroidLat,
        centroid_lon: zoneCentroidLon,
        city_id: cityId,
        zone_risk_score: zoneRiskScore,
        flood_prone: Boolean(zone.flood_prone),
      }, { timeout: 3000 });
      premium = mlResponse.data.premium_rupees;
    } catch (mlError) {
      console.warn('ML service fallback');
      premium = Math.round(100 * zoneRiskScore);
    }

    premium = applySeasonalGuard(premium, new Date().getMonth() + 1, cityId);
    premium = Math.max(80, Math.min(250, premium));

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
        city_id: cityId,
        resolved_location: resolvedLocation,
        recommended_tier: premium < 120 ? 'SEED' : premium < 180 ? 'STANDARD' : 'PREMIUM',
        tiers: {
          SEED: {
            premium: Math.round(premium * 0.65),
            max_payout: 600
          },
          STANDARD: {
            premium: Math.round(premium),
            max_payout: 1200
          },
          PREMIUM: {
            premium: Math.round(premium * 1.35),
            max_payout: 1800
          }
        }
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Premium calculation error:', err);
    res.status(500).json({ error: 'Premium calculation failed', code: 'PREMIUM_CALC_FAILED' });
  }
});

module.exports = router;
