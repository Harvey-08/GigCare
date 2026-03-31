// services/api/routes/webhooks.js
// Webhook endpoints for Razorpay - Person A

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// =====================================================
// POST /api/webhooks/razorpay
// Razorpay payment/payout webhooks
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
