// services/api/routes/policies.js
// Policy management endpoints - Person A

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// POST /api/policies
// Create a new policy (starts payment flow)
// =====================================================
router.post('/', authMiddleware('WORKER'), async (req, res) => {
  try {
    const { worker_id } = req.user;
    const { quote_id, coverage_tier } = req.body;

    if (!quote_id || !coverage_tier) {
      return res.status(422).json({
        error: 'Missing required fields: quote_id, coverage_tier',
        code: 'MISSING_FIELDS',
      });
    }

    // Fetch the premium quote
    const quoteRes = await db.query('SELECT * FROM premium_quotes WHERE quote_id = $1 AND worker_id = $2', [
      quote_id,
      worker_id,
    ]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or expired', code: 'QUOTE_NOT_FOUND' });
    }
    const quote = quoteRes.rows[0];

    // Check no overlapping active policy
    const existingRes = await db.query(
      'SELECT * FROM policies WHERE worker_id = $1 AND status = $2 AND week_end >= CURRENT_DATE',
      [worker_id, 'ACTIVE']
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({
        error: 'Worker already has an active policy this week',
        code: 'POLICY_OVERLAP',
      });
    }

    // Calculate premium based on tier
    const tierPremiums = { SEED: 80, STANDARD: 162, PREMIUM: 220 };
    const premium = tierPremiums[coverage_tier] || quote.premium_rupees;

    // Create policy
    const policy_id = `pol-${uuidv4().substring(0, 8)}`;
    const maxPayouts = { SEED: 600, STANDARD: 1200, PREMIUM: 1800 };

    const result = await db.createPolicy(policy_id, worker_id, quote_id, coverage_tier, premium, maxPayouts[coverage_tier], quote.week_start, quote.week_end);

    res.status(201).json({
      data: result.rows[0],
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Policy creation error:', err);
    res.status(500).json({ error: 'Policy creation failed', code: 'POLICY_CREATION_FAILED' });
  }
});

// =====================================================
// GET /api/policies/worker/:worker_id
// Get all policies for a worker
// =====================================================
router.get('/worker/:worker_id', authMiddleware('WORKER'), async (req, res) => {
  try {
    const { worker_id: currentWorker } = req.user;
    const { worker_id } = req.params;

    // Can only view own policies
    if (currentWorker !== worker_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const result = await db.getPoliciesForWorker(worker_id);
    res.json({
      data: result.rows,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Policies fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch policies', code: 'POLICIES_FETCH_FAILED' });
  }
});

// =====================================================
// GET /api/policies/:policy_id
// Get single policy detail
// =====================================================
router.get('/:policy_id', authMiddleware('WORKER'), async (req, res) => {
  try {
    const result = await db.getPolicy(req.params.policy_id);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
    }

    const policy = result.rows[0];
    // Verify policy belongs to current user
    if (policy.worker_id !== req.user.worker_id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    // Get associated claims
    const claimsRes = await db.query('SELECT * FROM claims WHERE policy_id = $1', [policy.policy_id]);

    res.json({
      data: {
        ...policy,
        claims: claimsRes.rows,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Policy fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch policy', code: 'POLICY_FETCH_FAILED' });
  }
});

// =====================================================
// POST /api/policies/:policy_id/activate
// Simulate Razorpay webhook to activate policy
// =====================================================
router.post('/:policy_id/activate', async (req, res) => {
  try {
    const { policy_id } = req.params;
    const { razorpay_payment_id } = req.body;

    // In production: verify Razorpay signature
    // For demo: assume valid if payment_id provided

    const result = await db.activatePolicy(policy_id, razorpay_payment_id || 'pay_demo_123');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
    }

    res.json({
      data: result.rows[0],
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Policy activation error:', err);
    res.status(500).json({ error: 'Policy activation failed', code: 'POLICY_ACTIVATION_FAILED' });
  }
});

module.exports = router;
