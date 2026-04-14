// services/api/routes/policies.js
const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../models/supabase');

const router = express.Router();

// =====================================
// POST /api/policies
// =====================================
router.post('/', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id } = req.user;
    const { quote_id, coverage_tier } = req.body;

    if (!quote_id || !coverage_tier) {
      return res.status(422).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
    }

    // Fetch the premium quote
    const { data: quote } = await supabase
      .from('premium_quotes')
      .select('*')
      .eq('quote_id', quote_id)
      .eq('user_id', user_id)
      .single();

    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Create policy
    const { data: policy, error: policyError } = await db.createPolicy(
      user_id,
      coverage_tier,
      quote.premium_rupees,
      600, // Simplified for demo
      quote.week_start,
      quote.week_end
    );

    if (policyError) throw policyError;

    res.status(201).json({ data: policy });
  } catch (err) {
    console.error('Policy creation error:', err);
    res.status(500).json({ error: 'Policy creation failed', code: 'POLICY_CREATION_FAILED' });
  }
});

// =====================================
// GET /api/policies/worker/:user_id
// =====================================
router.get('/worker/:user_id', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id: currentUserId } = req.user;
    const { user_id } = req.params;

    if (currentUserId !== user_id) return res.status(403).json({ error: 'Forbidden' });

    const { data: policies } = await db.getPoliciesForUser(user_id);
    res.json({ data: policies || [] });
  } catch (err) {
    console.error('Policies fetch error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
