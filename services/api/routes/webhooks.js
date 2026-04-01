// services/api/routes/webhooks.js
// Webhook endpoints for Razorpay - Person A

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// =====================================================
// POST /api/webhooks/razorpay-payment
// Simulate Razorpay payment callback (for demo)
// =====================================================
router.post('/razorpay-payment', async (req, res) => {
  try {
    const { policy_id, payment_id } = req.body;

    if (!policy_id || !payment_id) {
      return res.status(422).json({
        error: 'Missing required fields: policy_id, payment_id',
        code: 'MISSING_FIELDS',
      });
    }

    // Activate policy
    const result = await db.activatePolicy(policy_id, payment_id);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
    }

    const policy = result.rows[0];

    res.json({
      data: {
        policy_id,
        status: policy.status,
        activated_at: new Date().toISOString(),
        payment_id,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed', code: 'WEBHOOK_FAILED' });
  }
});

// =====================================================
// POST /api/webhooks/razorpay
// Razorpay payment/payout webhooks (production)
// =====================================================
router.post('/razorpay', async (req, res) => {
  try {
    const event = req.body;
    console.log('Razorpay webhook:', event.event);

    // For demo: accept all webhooks
    // In production: verify X-Razorpay-Signature header

    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      // Activate policy if payment metadata has policy_id
      const notes = payment.notes || {};
      if (notes.policy_id) {
        await db.activatePolicy(notes.policy_id, payment.id);
        console.log(`Policy ${notes.policy_id} activated via Razorpay`);
      }
    }

    if (event.event === 'payout.processed') {
      const payout = event.payload.payout.entity;
      // Update claim if payout metadata has claim_id
      const notes = payout.notes || {};
      if (notes.claim_id) {
        await db.updateClaimStatus(notes.claim_id, 'PAID', payout.id);
        console.log(`Claim ${notes.claim_id} marked as PAID via payout`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
