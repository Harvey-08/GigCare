const express = require('express');
const supabase = require('../models/supabase');
const db = require('../models/db');
const claimStore = require('../models/claimStore');
const reputationStore = require('../models/reputationStore');
const { internalServiceAuth } = require('../middleware/auth');
const { initiateUpiPayout } = require('../services/payout-service');
const { CITY_CONFIGS } = require('../config/cities');

const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:5002';
const DAILY_PAYOUT_CAP_RUPEES = clamp(process.env.DAILY_PAYOUT_CAP_RUPEES, 0, 50000, 3600);

const router = express.Router();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max, fallback) {
  const numeric = toNumber(value, fallback);
  return Math.max(min, Math.min(max, numeric));
}

function strongerAction(current, target) {
  const order = {
    APPROVED: 0,
    PARTIAL: 1,
    FLAGGED: 2,
    DENIED: 3,
  };

  const currentRank = order[String(current || '').toUpperCase()] ?? 0;
  const targetRank = order[String(target || '').toUpperCase()] ?? 0;
  return currentRank >= targetRank ? current : target;
}

function escalationTrust(action, trustScore) {
  const score = toNumber(trustScore, 0.5);
  if (action === 'DENIED') return Math.min(score, 0.15);
  if (action === 'FLAGGED') return Math.min(score, 0.45);
  if (action === 'PARTIAL') return Math.min(score, 0.7);
  return score;
}

function buildWorkerHistory({ workerReputation, behavior, claimsLast7Days }) {
  const approvedCount = toNumber(workerReputation?.approved_count, 0);
  const flaggedCount = toNumber(workerReputation?.flagged_count, 0);
  const deniedCount = toNumber(workerReputation?.denied_count, 0);
  const eventCount = Math.max(1, toNumber(workerReputation?.event_count, 0));
  const approvalRatio = approvedCount / eventCount;

  return {
    total_claims: toNumber(claimsLast7Days, 0),
    approved_claims_ratio: Number.isFinite(approvalRatio) ? Number(approvalRatio.toFixed(2)) : 0.5,
    average_payout_rupees: Math.round(toNumber(workerReputation?.last_average_payout_rupees, 800)),
    days_active: Math.max(1, Math.ceil(eventCount / 2)),
    recent_claims_24h: toNumber(behavior?.claims_last_24h, 0),
    recent_flagged_24h: toNumber(behavior?.denied_or_flagged_24h, 0),
    historical_risk_score: toNumber(workerReputation?.risk_score, 0),
    historical_flagged_count: flaggedCount,
    historical_denied_count: deniedCount,
  };
}

function buildClaimNotes({ triggerType, cityId, behavior, workerReputation, claimSignals }) {
  const notes = [];
  notes.push(`Claim triggered by ${String(triggerType || 'UNKNOWN').replace(/_/g, ' ').toLowerCase()} in ${cityId || 'unknown city'}.`);
  notes.push(`Recent activity shows ${behavior?.claims_last_24h || 0} claims in 24h and ${behavior?.claims_last_1h || 0} claims in 1h.`);
  notes.push(`Identity linkage count: device ${claimSignals?.shared_device_count || 1}, IP ${claimSignals?.shared_ip_worker_count || 1}.`);
  notes.push(`Current reputation risk score: ${toNumber(workerReputation?.risk_score, 0).toFixed(2)}.`);
  return notes.join(' ');
}

function getIstDayStartIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date(now).toISOString();
  }

  return new Date(`${year}-${month}-${day}T00:00:00+05:30`).toISOString();
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
    zone_id: payload.zone_id || null,
    city_id: payload.city_id || null,
    synthetic_fallback: true,
    simulated: true,
    created_at: new Date().toISOString(),
  };
}

async function callFraudService(payload) {
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 5000);

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
      signal: controller.signal,
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
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function findExistingClaimForEvent(policyId, eventId, triggerType, skipWindowDedupe = false) {
  const dedupeWindowStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  if (skipWindowDedupe) {
    if (!eventId) {
      return null;
    }

    const exact = await supabase
      .from('claims')
      .select('claim_id, status, final_payout, created_at')
      .eq('policy_id', policyId)
      .eq('trigger_event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!exact.error && exact.data) {
      return exact.data;
    }

    return null;
  }

  const fallbackExisting = claimStore.findFallbackClaimMatch({
    policyId,
    eventId,
    triggerType,
    sinceIso: dedupeWindowStart,
  });

  if (fallbackExisting) {
    return fallbackExisting;
  }

  if (eventId) {
    const exact = await supabase
      .from('claims')
      .select('claim_id, status, final_payout, created_at')
      .eq('policy_id', policyId)
      .eq('trigger_event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!exact.error && exact.data) {
      return exact.data;
    }
  }

  const windowed = await supabase
    .from('claims')
    .select('claim_id, status, final_payout, created_at')
    .eq('policy_id', policyId)
    .eq('trigger_type', triggerType)
    .gte('created_at', dedupeWindowStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!windowed.error && windowed.data) {
    return windowed.data;
  }

  return null;
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

async function getDailyPayoutTotalForUser(userId, sinceIso) {
  const statuses = ['APPROVED', 'PAID'];
  const queryRows = async (column) => {
    const { data, error } = await supabase
      .from('claims')
      .select('final_payout, status, created_at, payout_initiated_at')
      .eq(column, userId)
      .in('status', statuses)
      .gte('created_at', sinceIso);

    if (error) {
      return { error, rows: [] };
    }

    return { error: null, rows: data || [] };
  };

  let result = await queryRows('user_id');
  if (result.error && !isMissingClaimsTable(result.error)) {
    return claimStore.sumFallbackClaimsForUser({ userId, sinceIso, statuses });
  }

  const workerResult = await queryRows('worker_id');
  if (workerResult.error && !isMissingClaimsTable(workerResult.error)) {
    return claimStore.sumFallbackClaimsForUser({ userId, sinceIso, statuses });
  }

  const combined = new Map();
  for (const claim of [...result.rows, ...workerResult.rows]) {
    const claimId = claim.claim_id || `${claim.final_payout}_${claim.created_at}_${claim.status}`;
    if (!combined.has(claimId)) {
      combined.set(claimId, claim);
    }
  }

  return Array.from(combined.values()).reduce((sum, claim) => sum + toNumber(claim.final_payout, 0), 0);
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

async function getRecentClaimBehavior(userId) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [claims24hByUser, claims24hByWorker, claims1hByUser, claims1hByWorker] = await Promise.all([
    supabase
      .from('claims')
      .select('claim_id, zone_id, city_id, status, final_payout, created_at')
      .eq('user_id', userId)
      .gte('created_at', since24h),
    supabase
      .from('claims')
      .select('claim_id, zone_id, city_id, status, final_payout, created_at')
      .eq('worker_id', userId)
      .gte('created_at', since24h),
    supabase
      .from('claims')
      .select('claim_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since1h),
    supabase
      .from('claims')
      .select('claim_id', { count: 'exact', head: true })
      .eq('worker_id', userId)
      .gte('created_at', since1h),
  ]);

  const list24h = [];
  if (!claims24hByUser.error) list24h.push(...(claims24hByUser.data || []));
  if (!claims24hByWorker.error) list24h.push(...(claims24hByWorker.data || []));

  const dedup = new Map();
  for (const claim of list24h) {
    const key = claim.claim_id || `${claim.zone_id}_${claim.city_id}_${claim.created_at}`;
    if (!dedup.has(key)) {
      dedup.set(key, claim);
    }
  }

  const claims24h = Array.from(dedup.values());
  const distinctZones24h = new Set(claims24h.map((claim) => claim.zone_id).filter(Boolean)).size;
  const distinctCities24h = new Set(claims24h.map((claim) => claim.city_id).filter(Boolean)).size;
  const deniedOrFlagged24h = claims24h.filter((claim) => ['DENIED', 'FLAGGED'].includes(claim.status)).length;

  const count1h = Math.max(
    toNumber(claims1hByUser.count, 0),
    toNumber(claims1hByWorker.count, 0)
  );

  return {
    claims_last_24h: claims24h.length,
    claims_last_1h: count1h,
    distinct_zones_24h: distinctZones24h,
    distinct_cities_24h: distinctCities24h,
    denied_or_flagged_24h: deniedOrFlagged24h,
  };
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
      force_create = false,
      claim_signals = {},
    } = req.body;

    if ((!zone_id && !city_id) || !trigger_type) {
      return res.status(422).json({ error: 'Missing required fields (need zone_id or city_id)', code: 'MISSING_FIELDS' });
    }

    let policies = [];
    let policiesError = null;

    if (zone_id) {
      const result = await db.getActivePoliciesInZone(
        zone_id,
        new Date().toISOString().split('T')[0]
      );
      policies = result.data;
      policiesError = result.error;

      // Some auto-evaluated geogrid zones may not exactly match worker profile zones.
      // Fall back to city-wide active policy lookup so valid workers in that city still receive claims.
      if ((!policies || policies.length === 0) && city_id) {
        const cityName = CITY_CONFIGS.find(c => c.city_id === city_id)?.city_name || city_id;
        const cityResult = await db.getActivePoliciesInCity(
          cityName,
          new Date().toISOString().split('T')[0]
        );

        if (!cityResult.error && cityResult.data) {
          policies = cityResult.data;
          policiesError = null;
        }
      }
    } else if (city_id) {
      const cityName = CITY_CONFIGS.find(c => c.city_id === city_id)?.city_name || city_id;
      const result = await db.getActivePoliciesInCity(
        cityName,
        new Date().toISOString().split('T')[0]
      );
      policies = result.data;
      policiesError = result.error;
    }

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
    const hours = clamp(disruption_hours, 0.5, 8, 3);
    const severity = clamp(severity_factor, 0.6, 2.0, 1.0);
    const peak = clamp(peak_multiplier, 0.75, 1.5, 1.0);

    const dailyPayoutState = new Map();

    for (const policy of policies) {
      const userId = policy.user_id || policy.worker_id || policy.profiles?.id;
      if (!userId) {
        continue;
      }

      const existingClaim = await findExistingClaimForEvent(policy.policy_id, event_id, trigger_type, Boolean(force_create));
      if (existingClaim) {
        continue;
      }

      const hourlyRate = toNumber(policy.profiles?.avg_daily_income, 650) / 8;
      const rawPayout = Math.round(hourlyRate * hours * severity * peak);
      const maxPolicyPayout = toNumber(policy.max_payout, rawPayout);
      const dayKey = `${userId}_${getIstDayStartIso()}`;

      if (!dailyPayoutState.has(dayKey)) {
        const dailyAlreadyPaid = await getDailyPayoutTotalForUser(userId, getIstDayStartIso());
        dailyPayoutState.set(dayKey, {
          alreadyPaid: dailyAlreadyPaid,
          allocated: 0,
        });
      }

      const dailyState = dailyPayoutState.get(dayKey);
      const dailyRemaining = Math.max(0, DAILY_PAYOUT_CAP_RUPEES - dailyState.alreadyPaid - dailyState.allocated);
      const finalPayout = Math.min(rawPayout, maxPolicyPayout, dailyRemaining);

      const claimsLast7Days = await countRecentClaimsForUser(userId);
      const behavior = await getRecentClaimBehavior(userId);

      const deviceFingerprint = claim_signals.device_fingerprint || `device-${userId}`;
      const ipAddress = claim_signals.ip_address || 'UNKNOWN';

      const [workerReputation, sharedDeviceWorkers, sharedIpWorkers] = await Promise.all([
        reputationStore.getWorkerReputation(userId),
        reputationStore.getSharedIdentityWorkerCount('device', deviceFingerprint),
        reputationStore.getSharedIdentityWorkerCount('ip', ipAddress),
      ]);

      const fraudFeatures = {
        gps_cell_offset_km: claim_signals.gps_cell_offset_km ?? 0.1,
        gps_wifi_offset_km: claim_signals.gps_wifi_offset_km ?? 0.1,
        implied_max_speed_kmh: claim_signals.implied_max_speed_kmh ?? 22,
        accelerometer_mag: claim_signals.accelerometer_mag ?? 8.3,
        accel_gps_delta: claim_signals.accel_gps_delta ?? 1.5,
        ip_gps_mismatch: claim_signals.ip_gps_mismatch ?? 0,
        timezone_mismatch: claim_signals.timezone_mismatch ?? 0,
        shared_device_count: Math.max(toNumber(claim_signals.shared_device_count, 1), sharedDeviceWorkers),
        rooted_device: claim_signals.rooted_device ?? 0,
        claim_cluster_10min: claim_signals.claim_cluster_10min ?? Math.min(3, policies.length),
        claims_last_7_days: claim_signals.claims_last_7_days ?? claimsLast7Days,
        claims_last_24h: behavior.claims_last_24h,
        claims_last_1h: behavior.claims_last_1h,
        distinct_zones_24h: behavior.distinct_zones_24h,
        distinct_cities_24h: behavior.distinct_cities_24h,
        denied_or_flagged_24h: behavior.denied_or_flagged_24h,
        shared_ip_worker_count: sharedIpWorkers,
        historical_risk_score: toNumber(workerReputation.risk_score, 0),
        seconds_since_trigger: claim_signals.seconds_since_trigger ?? 180,
        gps_zone_offset_km: claim_signals.gps_zone_offset_km ?? 0.2,
        platform_login_match: claim_signals.platform_login_match ?? 1,
        cross_city_claim: claim_signals.cross_city_claim ?? 0,
      };

      const fraudResult = await callFraudService({
        worker_id: userId,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        wifi_ssids: claim_signals.wifi_ssids || [],
        claim_city_id: city_id || null,
        worker_registered_city_id: null,
        worker_history: buildWorkerHistory({
          workerReputation,
          behavior,
          claimsLast7Days,
        }),
        claim_notes: claim_signals.claim_notes || buildClaimNotes({
          triggerType: trigger_type,
          cityId: city_id,
          behavior,
          workerReputation,
          claimSignals: {
            shared_device_count: Math.max(toNumber(claim_signals.shared_device_count, 1), sharedDeviceWorkers),
            shared_ip_worker_count: sharedIpWorkers,
          },
        }),
        features: fraudFeatures,
      });

      const escalationReasons = [];
      let action = String(fraudResult.action || 'PARTIAL').toUpperCase();
      const cappedByDailyLimit = dailyRemaining < rawPayout;
      if (behavior.claims_last_1h >= 3) {
        action = strongerAction(action, 'FLAGGED');
        escalationReasons.push('velocity_spike_1h');
      }
      if (behavior.distinct_cities_24h >= 2 || behavior.distinct_zones_24h >= 3) {
        action = strongerAction(action, 'FLAGGED');
        escalationReasons.push('cross_zone_or_city_pattern');
      }
      if (toNumber(workerReputation.risk_score, 0) >= 0.85 || sharedDeviceWorkers >= 8 || sharedIpWorkers >= 12) {
        action = strongerAction(action, 'DENIED');
        escalationReasons.push('high_reputation_or_linkage_risk');
      }

      if (cappedByDailyLimit) {
        action = strongerAction(action, 'PARTIAL');
        escalationReasons.push(`daily_payout_cap_reached_${DAILY_PAYOUT_CAP_RUPEES}`);
      }

      const adjustedTrust = escalationTrust(action, fraudResult.trust_score);
      const explanation = [fraudResult.explanation, ...escalationReasons]
        .filter(Boolean)
        .join(' | ');

      const claimPayload = {
        policy_id: policy.policy_id,
        user_id: userId,
        trigger_event_id: event_id,
        zone_id: policy.profiles?.zone_id || zone_id || null,
        city_id: city_id || null,
        trigger_type,
        trigger_value,
        disruption_start: req.body.disruption_start || new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        disruption_end: req.body.disruption_end || new Date().toISOString(),
        disruption_hours: hours,
        raw_payout: rawPayout,
        final_payout: finalPayout,
        trust_score: adjustedTrust,
        status: action,
        fraud_reason: explanation,
      };

      const claim = await insertClaimCompat(claimPayload);
      claimStore.upsertFallbackClaim(claim);

      await reputationStore.recordOutcome({
        workerId: userId,
        action,
        deviceFingerprint,
        ipAddress,
      });

      if (action === 'APPROVED' && finalPayout > 0) {
        try {
          await initiateUpiPayout(claim.claim_id || claim.id, userId, finalPayout, null);
          dailyState.allocated += finalPayout;
        } catch (payoutError) {
          console.warn(`Payout initiation failed for ${claim.claim_id}:`, payoutError.message);
        }
      }

      if (action === 'PARTIAL' && cappedByDailyLimit) {
        dailyState.allocated += 0;
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