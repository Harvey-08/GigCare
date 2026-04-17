const Razorpay = require('razorpay');
const supabase = require('../models/supabase');

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const mode = process.env.RAZORPAY_MODE || 'sandbox'; // Phase 3: production mode support

  if (!keyId || !keySecret || keyId === 'none' || keySecret === 'none') {
    return null;
  }

  console.log(`🔄 Razorpay initialized in ${mode} mode`);
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

async function initiateUpiPayout(claimId, workerId, amountRupees, upiVpa) {
  const razorpay = getRazorpayClient();
  const amountPaise = Math.round(amountRupees * 100);
  const testVpa = upiVpa || 'success@razorpay';

  async function updateClaimByKey(updatePayload) {
    const keys = [claimId, String(claimId || '').trim()];

    for (const key of keys) {
      if (!key) continue;

      const claimIdResult = await supabase
        .from('claims')
        .update(updatePayload)
        .eq('claim_id', key)
        .select('claim_id')
        .maybeSingle();

      if (!claimIdResult.error && claimIdResult.data) {
        return claimIdResult;
      }

      const idResult = await supabase
        .from('claims')
        .update(updatePayload)
        .eq('id', key)
        .select('id')
        .maybeSingle();

      if (!idResult.error && idResult.data) {
        return idResult;
      }
    }

    return { data: null, error: new Error(`Unable to update claim ${claimId}`) };
  }

  try {
    if (!razorpay) {
      const simulatedPayoutId = `sim_payout_${claimId}`;
      const payoutUpdate = await updateClaimByKey({
        razorpay_payout_id: simulatedPayoutId,
        payout_initiated_at: new Date().toISOString(),
        status: 'PAID',
      });

      if (payoutUpdate.error) {
        throw payoutUpdate.error;
      }

      return { success: true, payout_id: simulatedPayoutId, status: 'processed', simulated: true };
    }

    const contact = await razorpay.contacts.create({
      name: `Worker ${workerId}`,
      type: 'employee',
      reference_id: workerId,
    });

    const fundAccount = await razorpay.fundAccount.create({
      contact_id: contact.id,
      account_type: 'vpa',
      vpa: { address: testVpa },
    });

    const payout = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccount.id,
      amount: amountPaise,
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: claimId,
      narration: `GigCare payout ${claimId}`,
    });

    const payoutUpdate = await updateClaimByKey({
      razorpay_payout_id: payout.id,
      payout_initiated_at: new Date().toISOString(),
    });

    if (payoutUpdate.error) {
      throw payoutUpdate.error;
    }

    return { success: true, payout_id: payout.id, status: payout.status };
  } catch (error) {
    await updateClaimByKey({
      status: 'FLAGGED',
      fraud_reason: error.message,
    });

    throw error;
  }
}

module.exports = {
  initiateUpiPayout,
};