// services/api/routes/claims.js
// Claims management endpoints - Person A + C (trigger engine calls POST)

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware, internalServiceAuth } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// TRUST SCORE CALCULATION (Rule-based for Phase 2)
// =====================================================
function calculateTrustScore(claim, zone) {
  let trust = 1.0;

  // GPS sanity check: claim should be in reasonable zone bounds
  if (claim.gps_lat && claim.gps_lon && zone.lat && zone.lon) {
    const distance = haversine(claim.gps_lat, claim.gps_lon, zone.lat, zone.lon);
    if (distance > 5) {
      // More than 5km away = highly suspicious
      trust -= 0.35;
    }
  }

  // Claim submitted too quickly after trigger?
  const timeDelta = (Date.now() - claim.trigger_timestamp) / 1000 / 60; // minutes
  if (timeDelta < 5) {
    trust -= 0.10;
  }

  // Reward clean history
  if (!claim.past_fraud_flags) {
    trust += 0.05;
  }

  return Math.max(0, Math.min(1, trust)); // Clamp to 0-1
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =====================================================
// POST /api/claims/auto-create
// Trigger engine calls this to auto-create claims
// =====================================================
router.post('/auto-create', internalServiceAuth, async (req, res) => {
  try {
    const { zone_id, trigger_type, trigger_value, disruption_hours, severity_factor, peak_multiplier, event_id } = req.body;

    if (!zone_id || !trigger_type) {
      return res.status(422).json({
        error: 'Missing required fields: zone_id, trigger_type',
        code: 'MISSING_FIELDS',
      });
    }

    // Get zone
    const zoneRes = await db.getZone(zone_id);
    if (zoneRes.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }
    const zone = zoneRes.rows[0];

    // Get active policies in this zone
    const policiesRes = await db.getActivePoliciesInZone(zone_id, new Date().toISOString().split('T')[0]);

    if (policiesRes.rows.length === 0) {
      return res.json({ data: [], created: 0, meta: { timestamp: new Date().toISOString() } }); // No policies = no claims
    }

    const createdClaims = [];
    const hours = disruption_hours || 3;
    const severity = severity_factor || 1.0;
    const multiplier = peak_multiplier || 1.0;

    for (const policy of policiesRes.rows) {
      // Get worker
      const workerRes = await db.getWorker(policy.worker_id);
      if (workerRes.rows.length === 0) continue;
      const worker = workerRes.rows[0];

      // Calculate payout
      const dailyIncome = worker.avg_daily_income || 650;
      const payout = Math.round((dailyIncome / 8) * hours * severity * multiplier);
      const finalPayout = Math.min(payout, policy.max_payout);

      // Calculate trust score
      const trust = calculateTrustScore(
        {
          gps_lat: null,
          gps_lon: null,
          trigger_timestamp: Date.now(),
          past_fraud_flags: worker.fraud_flags || 0,
        },
        zone
      );

      // Determine status based on trust
      const status = trust > 0.85 ? 'APPROVED' : trust > 0.6 ? 'PARTIAL' : 'FLAGGED';

      // Create claim
      const claim_id = `clm-${uuidv4().substring(0, 8)}`;
      const claimRes = await db.createClaim(claim_id, policy.policy_id, policy.worker_id, event_id || null, trigger_type, trigger_value, hours, payout, trust, status);

      if (claimRes.rows.length > 0) {
        createdClaims.push(claimRes.rows[0]);
      }
    }

    res.status(201).json({
      data: createdClaims,
      meta: { 
        timestamp: new Date().toISOString(),
        created: createdClaims.length,
        zone_id,
        trigger_type,
      },
    });
  } catch (err) {
    console.error('Claim creation error:', err);
    res.status(500).json({ error: 'Claim creation failed', code: 'CLAIM_CREATION_FAILED' });
  }
});

// =====================================================
// GET /api/claims/worker/:worker_id
// Get all claims for a worker
// =====================================================
router.get('/worker/:worker_id', authMiddleware('WORKER'), async (req, res) => {
  try {
    const { worker_id: currentWorker } = req.user;
    const { worker_id } = req.params;

    if (currentWorker !== worker_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const result = await db.getClaimsForWorker(worker_id);
    res.json({
      data: result.rows,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Claims fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch claims', code: 'CLAIMS_FETCH_FAILED' });
  }
});

// =====================================================
// GET /api/claims/:claim_id
// Get single claim detail
// =====================================================
router.get('/:claim_id', authMiddleware('WORKER'), async (req, res) => {
  try {
    const result = await db.getClaim(req.params.claim_id);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found', code: 'CLAIM_NOT_FOUND' });
    }

    const claim = result.rows[0];
    if (claim.worker_id !== req.user.worker_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    res.json({
      data: claim,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Claim fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch claim', code: 'CLAIM_FETCH_FAILED' });
  }
});

module.exports = router;
