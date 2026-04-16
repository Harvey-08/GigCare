const express = require('express');
const supabase = require('../models/supabase');
const db = require('../models/db');
const { internalServiceAuth } = require('../middleware/auth');
const { initiateUpiPayout } = require('../services/payout-service');

const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:5002';

const router = express.Router();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMissingClaimsTable(error) {
  return (
    error &&
    error.code === 'PGRST205' &&
    typeof error.message === 'string' &&
    error.message.includes("public.claims")
  );
}

function buildSyntheticClaim(payload) {
  return {
    claim_id: `sim_claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    policy_id: payload.policy_id,
    user_id: payload.user_id,
    worker_id: payload.user_id,
    trigger_event_id: payload.trigger_event_id,
    trigger_type: payload.trigger_type,
    trigger_value: payload.trigger_value,
    disruption_start: payload.disruption_start,
    disruption_end: payload.disruption_end,
    disruption_hours: payload.disruption_hours,
    raw_payout: payload.raw_payout,
    final_payout: payload.final_payout,
    trust_score: payload.trust_score,
    status: payload.status,
    fraud_reason: payload.fraud_reason,
    simulated: true,
  };
}

async function callFraudService(payload) {
  try {
    // Enhance with NLP if enabled (Phase 3)
    const enrichedPayload = {
      ...payload,
      enable_nlp_enhancement: process.env.ENABLE_NLP_FRAUD_ENHANCEMENT !== 'false',
    };

    const response = await fetch(`${FRAUD_SERVICE_URL}/score-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });

    if (!response.ok) {
      throw new Error(`Fraud service returned ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Safe fallback when fraud service is temporarily unavailable.
    return {
      trust_score: 0.75,
      action: 'PARTIAL',
      explanation: 'Fraud service unavailable, applied conservative fallback decision',
      fraud_probability: 0.5,
    };
  }
}

async function countRecentClaimsForUser(userId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let result = await supabase
    .from('claims')
    .select('claim_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (!result.error) {
    return result.count || 0;
  }

  if (isMissingClaimsTable(result.error)) {
    return 0;
  }

  result = await supabase
    .from('claims')
    .select('claim_id', { count: 'exact', head: true })
    .eq('worker_id', userId)
    .gte('created_at', since);

  if (!result.error) {
    return result.count || 0;
  }

  return 0;
}

async function insertClaimCompat(payload) {
  const basePayload = {
    policy_id: payload.policy_id,
    trigger_event_id: payload.trigger_event_id,
    trigger_type: payload.trigger_type,
    trigger_value: payload.trigger_value,
    disruption_start: payload.disruption_start,
    disruption_end: payload.disruption_end,
    disruption_hours: payload.disruption_hours,
    raw_payout: payload.raw_payout,
    final_payout: payload.final_payout,
    trust_score: payload.trust_score,
    status: payload.status,
    fraud_reason: payload.fraud_reason,
  };

  const variants = [
    { ...basePayload, user_id: payload.user_id },
    { ...basePayload, worker_id: payload.user_id },
    {
      policy_id: payload.policy_id,
      user_id: payload.user_id,
      trigger_event_id: payload.trigger_event_id,
      trigger_type: payload.trigger_type,
      final_payout: payload.final_payout,
      trust_score: payload.trust_score,
      status: payload.status,
      fraud_reason: payload.fraud_reason,
    },
    {
      policy_id: payload.policy_id,
      worker_id: payload.user_id,
      trigger_event_id: payload.trigger_event_id,
      trigger_type: payload.trigger_type,
      final_payout: payload.final_payout,
      trust_score: payload.trust_score,
      status: payload.status,
      fraud_reason: payload.fraud_reason,
    },
  ];

  let lastError = null;
  for (const variant of variants) {
    const { data, error } = await supabase
      .from('claims')
      .insert(variant)
      .select('*')
      .single();

    if (!error) {
      return data;
    }

    if (isMissingClaimsTable(error)) {
      return buildSyntheticClaim(payload);
    }

    lastError = error;
  }

  if (isMissingClaimsTable(lastError)) {
    return buildSyntheticClaim(payload);
  }

  throw lastError;
}

router.post('/auto-create', internalServiceAuth, async (req, res) => {
  try {
    const {
      zone_id,
      city_id,
      trigger_type,
      trigger_value,
      disruption_hours,
      severity_factor,
      peak_multiplier,
      event_id,
      claim_signals = {},
    } = req.body;

    if (!zone_id || !trigger_type) {
      return res.status(422).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
    }

    const { data: policies, error: policiesError } = await db.getActivePoliciesInZone(
      zone_id,
      new Date().toISOString().split('T')[0]
    );

    if (policiesError || !policies || policies.length === 0) {
      return res.status(201).json({
        data: [],
        meta: {
          created: 0,
          city_id: city_id || null,
          zone_id,
        },
      });
    }

    const createdClaims = [];
    const hours = toNumber(disruption_hours, 3);
    const severity = toNumber(severity_factor, 1.0);
    const peak = toNumber(peak_multiplier, 1.0);

    for (const policy of policies) {
      const userId = policy.user_id || policy.worker_id || policy.profiles?.id;
      if (!userId) {
        continue;
      }

      const hourlyRate = toNumber(policy.profiles?.avg_daily_income, 650) / 8;
      const rawPayout = Math.round(hourlyRate * hours * severity * peak);
      const finalPayout = Math.min(rawPayout, toNumber(policy.max_payout, rawPayout));

      const claimsLast7Days = await countRecentClaimsForUser(userId);

      const fraudFeatures = {
        gps_cell_offset_km: claim_signals.gps_cell_offset_km ?? 0.1,
        gps_wifi_offset_km: claim_signals.gps_wifi_offset_km ?? 0.1,
        implied_max_speed_kmh: claim_signals.implied_max_speed_kmh ?? 22,
        accelerometer_mag: claim_signals.accelerometer_mag ?? 8.3,
        accel_gps_delta: claim_signals.accel_gps_delta ?? 1.5,
        ip_gps_mismatch: claim_signals.ip_gps_mismatch ?? 0,
        timezone_mismatch: claim_signals.timezone_mismatch ?? 0,
        shared_device_count: claim_signals.shared_device_count ?? 1,
        rooted_device: claim_signals.rooted_device ?? 0,
        claim_cluster_10min: claim_signals.claim_cluster_10min ?? Math.min(3, policies.length),
        claims_last_7_days: claim_signals.claims_last_7_days ?? claimsLast7Days,
        seconds_since_trigger: claim_signals.seconds_since_trigger ?? 180,
        gps_zone_offset_km: claim_signals.gps_zone_offset_km ?? 0.2,
        platform_login_match: claim_signals.platform_login_match ?? 1,
        cross_city_claim: claim_signals.cross_city_claim ?? 0,
      };

      const fraudResult = await callFraudService({
        worker_id: userId,
        device_fingerprint: claim_signals.device_fingerprint || `device-${userId}`,
        ip_address: claim_signals.ip_address || 'UNKNOWN',
        wifi_ssids: claim_signals.wifi_ssids || [],
        claim_city_id: city_id || null,
        worker_registered_city_id: null,
        features: fraudFeatures,
      });

      const claimPayload = {
        policy_id: policy.policy_id,
        user_id: userId,
        trigger_event_id: event_id,
        trigger_type,
        trigger_value,
        disruption_start: req.body.disruption_start || new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        disruption_end: req.body.disruption_end || new Date().toISOString(),
        disruption_hours: hours,
        raw_payout: rawPayout,
        final_payout: finalPayout,
        trust_score: fraudResult.trust_score,
        status: fraudResult.action,
        fraud_reason: fraudResult.explanation,
      };

      const claim = await insertClaimCompat(claimPayload);

      if (fraudResult.action === 'APPROVED') {
        try {
          await initiateUpiPayout(claim.claim_id, userId, finalPayout, null);
        } catch (payoutError) {
          console.warn(`Payout initiation failed for ${claim.claim_id}:`, payoutError.message);
        }
      }

      createdClaims.push(claim);
    }

    res.status(201).json({
      data: createdClaims,
      meta: {
        created: createdClaims.length,
        city_id: city_id || null,
        zone_id,
      },
    });
  } catch (err) {
    console.error('Fraud claim creation error:', err);
    res.status(500).json({ error: 'Fraud claim creation failed', code: 'FRAUD_CLAIM_CREATION_FAILED' });
  }
});

module.exports = router;