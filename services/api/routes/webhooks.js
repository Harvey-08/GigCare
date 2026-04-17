// services/api/routes/webhooks.js
// Webhook endpoints for Razorpay - Person A

const express = require('express');
const crypto = require('crypto');
const supabase = require('../models/supabase');
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
    const { data: policy, error: activateError } = await db.activatePolicy(policy_id, payment_id);

    if (activateError || !policy) {
      return res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
    }

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
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (signature && webhookSecret) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      if (signature !== expected) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    console.log('Razorpay webhook:', event.event);

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
      const claimId = payout.reference_id || payout.notes?.claim_id;
      if (claimId) {
        await supabase
          .from('claims')
          .update({
            status: 'PAID',
            razorpay_payout_id: payout.id,
            paid_at: new Date().toISOString(),
          })
          .eq('claim_id', claimId);
        console.log(`Claim ${claimId} marked as PAID via payout`);
      }
    }

    if (event.event === 'payout.failed') {
      const payout = event.payload.payout.entity;
      const claimId = payout.reference_id || payout.notes?.claim_id;
      if (claimId) {
        await supabase
          .from('claims')
          .update({
            status: 'FLAGGED',
            fraud_reason: payout.failure_reason || 'Payout failed',
          })
          .eq('claim_id', claimId);
        console.log(`Claim ${claimId} flagged via failed payout`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
