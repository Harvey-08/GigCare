// services/api/routes/claims.js
const express = require('express');
const db = require('../models/db');
const claimStore = require('../models/claimStore');
const { authMiddleware, internalServiceAuth } = require('../middleware/auth');
const supabase = require('../models/supabase');

const router = express.Router();

function isMissingClaimsTable(error) {
  return (
    error &&
    error.code === 'PGRST205' &&
    typeof error.message === 'string' &&
    error.message.includes('public.claims')
  );
}

// =====================================
// POST /api/claims/auto-create
// =====================================
router.post('/auto-create', internalServiceAuth, async (req, res) => {
  try {
    const { zone_id, trigger_type, trigger_value, disruption_hours, severity_factor, event_id } = req.body;

    if (!zone_id || !trigger_type) {
      return res.status(422).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
    }

    // Get active policies in this zone
    const { data: policies, error: policiesError } = await db.getActivePoliciesInZone(zone_id, new Date().toISOString().split('T')[0]);

    if (policiesError || !policies || policies.length === 0) {
      return res.json({ data: [], created: 0 });
    }

    const createdClaims = [];
    const hours = disruption_hours || 3;
    const severity = severity_factor || 1.0;

    for (const policy of policies) {
      // Calculate payout logic (Simplified for demo)
      const dailyIncome = policy.profiles?.avg_daily_income || 650;
      const payout = Math.round((dailyIncome / 8) * hours * severity);
      const finalPayout = Math.min(payout, policy.max_payout);

      // Determine status (Randomized for demo trust evaluation)
      const status = Math.random() > 0.1 ? 'APPROVED' : 'FLAGGED';

      const { data: claim, error: claimError } = await db.createClaim(
        policy.policy_id,
        policy.user_id,
        event_id,
        trigger_type,
        finalPayout,
        1.0,
        status
      );

      if (claim) createdClaims.push(claim);
    }

    res.status(201).json({
      data: createdClaims,
      meta: { created: createdClaims.length },
    });
  } catch (err) {
    console.error('Claim creation error:', err);
    res.status(500).json({ error: 'Claim creation failed', code: 'CLAIM_CREATION_FAILED' });
  }
});

// =====================================
// GET /api/claims/worker/:user_id
// =====================================
router.get('/worker/:user_id', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id: currentUserId } = req.user;
    const { user_id } = req.params;

    if (currentUserId !== user_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const { data: claims, error } = await db.getClaimsForUser(user_id);

    if (error && !isMissingClaimsTable(error)) {
      throw error;
    }

    if (error || !claims || claims.length === 0) {
      const fallbackClaims = claimStore.listFallbackClaimsForUser(user_id);
      return res.json({ data: fallbackClaims });
    }

    res.json({ data: claims });
  } catch (err) {
    console.error('Claims fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch claims', code: 'CLAIMS_FETCH_FAILED' });
  }
});

module.exports = router;
