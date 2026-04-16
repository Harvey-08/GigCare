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
    let { data: quote, error: quoteError } = await supabase
      .from('premium_quotes')
      .select('*')
      .eq('quote_id', quote_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (!quote && quoteError && quoteError.code !== 'PGRST116') {
      throw quoteError;
    }

    if (!quote) {
      const fallbackQuote = await supabase
        .from('premium_quotes')
        .select('*')
        .eq('quote_id', quote_id)
        .eq('worker_id', user_id)
        .maybeSingle();

      if (fallbackQuote.error && fallbackQuote.error.code !== 'PGRST116') {
        throw fallbackQuote.error;
      }

      quote = fallbackQuote.data;
    }

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

    res.status(201).json({
      data: {
        ...policy,
        id: policy?.policy_id || policy?.id,
      },
    });
  } catch (err) {
    console.error('Policy creation error:', err);
    res.status(500).json({ error: 'Policy creation failed', code: 'POLICY_CREATION_FAILED' });
  }
});

// =====================================
// POST /api/policies/:policy_id/activate
// =====================================
router.post('/:policy_id/activate', authMiddleware('worker'), async (req, res) => {
  try {
    const { policy_id } = req.params;
    const { user_id } = req.user;

    let { data: policy, error: fetchError } = await db.supabase
      .from('policies')
      .select('*')
      .eq('policy_id', policy_id)
      .maybeSingle();

    if (
      !policy &&
      fetchError &&
      fetchError.code !== 'PGRST116' &&
      fetchError.code !== '42703'
    ) {
      throw fetchError;
    }

    if (!policy) {
      const fallbackPolicy = await db.supabase
        .from('policies')
        .select('*')
        .eq('id', policy_id)
        .maybeSingle();

      if (fallbackPolicy.error && fallbackPolicy.error.code !== 'PGRST116') {
        throw fallbackPolicy.error;
      }

      policy = fallbackPolicy.data;
    }

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
    }

    const policyOwnerId = policy.user_id || policy.worker_id;
    if (policyOwnerId !== user_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const targetPolicyId = policy.policy_id || policy.id;
    const { data: updatedPolicy, error: updateError } = await db.activatePolicy(targetPolicyId, 'demo_payment_id');

    if (updateError) {
      throw updateError;
    }

    res.json({ data: updatedPolicy });
  } catch (err) {
    console.error('Policy activation error:', err);
    res.status(500).json({ error: 'Policy activation failed', code: 'POLICY_ACTIVATION_FAILED' });
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
