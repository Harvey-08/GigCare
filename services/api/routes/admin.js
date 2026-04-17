// services/api/routes/admin.js
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const claimStore = require('../models/claimStore');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../models/supabase');
const jwt = require('jsonwebtoken');
const { CITY_CONFIGS } = require('../config/cities');

const router = express.Router();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:5002';

function dedupeClaims(primary = [], secondary = []) {
  const map = new Map();

  for (const claim of [...primary, ...secondary]) {
    const key = claim.claim_id || `${claim.policy_id}_${claim.trigger_event_id}_${claim.created_at || ''}`;
    if (!map.has(key)) {
      map.set(key, claim);
    }
  }

  return Array.from(map.values());
}

// =====================================================
// POST /api/admin/login
// Fixed credential-based login for admin
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Fixed credentials from env
    const expectedEmail = process.env.ADMIN_EMAIL || 'gigcare@admin.com';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'Admin123@';

    if (email === expectedEmail && password === expectedPassword) {
      // Create a dummy profile object for the token
      const profile = { id: 'admin-fixed-id', email, role: 'admin', full_name: 'System Admin' };
      
      const token = jwt.sign(
        { user_id: profile.id, email: profile.email, role: profile.role },
        process.env.JWT_SECRET || 'fallback-super-secret-key',
        { expiresIn: '12h' }
      );
      
      return res.json({ data: { token, profile } });
    }

    return res.status(401).json({ error: 'Invalid admin credentials', code: 'UNAUTHORIZED' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_ERROR' });
  }
});

// =====================================================
// POST /api/admin/trigger-event
// Admin fires a trigger event manually (for demo)
// =====================================================
router.post('/trigger-event', authMiddleware('admin'), async (req, res) => {
  try {
    const { zone_id, city_id, trigger_type, trigger_value, reason } = req.body;
    const isCityWideTrigger = !zone_id && !!city_id;

    const allowedTriggerTypes = ['HEAVY_RAIN', 'EXTREME_HEAT', 'POOR_AQI', 'CURFEW', 'APP_OUTAGE', 'OTHER_REASON'];

    if (!trigger_type || trigger_value === undefined || (!zone_id && !city_id)) {
      return res.status(422).json({
        error: 'Missing required fields: zone_id/city_id, trigger_type, trigger_value',
        code: 'MISSING_FIELDS',
      });
    }

    if (!allowedTriggerTypes.includes(trigger_type)) {
      return res.status(422).json({
        error: `Unsupported trigger_type. Allowed: ${allowedTriggerTypes.join(', ')}`,
        code: 'INVALID_TRIGGER_TYPE',
      });
    }

    // Keep frontend-friendly "OTHER_REASON" while persisting enum-safe APP_OUTAGE.
    const normalizedTriggerType = trigger_type === 'OTHER_REASON' ? 'APP_OUTAGE' : trigger_type;

    let targetZoneId = zone_id;
    let targetCityId = city_id || null;
    const targetCityName = CITY_CONFIGS.find((city) => city.city_id === targetCityId)?.city_name || targetCityId;

    if (!targetZoneId && targetCityId) {
      const { data: cityZone, error: cityZoneError } = await supabase
        .from('zones')
        .select('zone_id, city')
        .eq('city', targetCityName)
        .order('zone_risk_score', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (cityZoneError) {
        throw cityZoneError;
      }

      targetZoneId = cityZone?.zone_id || `${targetCityId}_CENTROID`;
    }

    // Create event via Supabase
    const severity =
      normalizedTriggerType === 'HEAVY_RAIN'
        ? 1.3
        : normalizedTriggerType === 'POOR_AQI' && trigger_value >= 400
          ? 1.5
          : normalizedTriggerType === 'CURFEW'
            ? 1.4
            : normalizedTriggerType === 'APP_OUTAGE'
              ? 1.2
              : 1.0;
    
    const { data: event, error: eventError } = await db.createTriggerEvent(
      targetZoneId, 
      normalizedTriggerType,
      trigger_value, 
      severity
    );

    if (eventError) throw eventError;

    // Call auto-create endpoint internally
    try {
      const claimsRes = await axios.post(`${API_URL}/api/fraud/auto-create`, {
        zone_id: isCityWideTrigger ? null : targetZoneId,
        city_id: targetCityId,
        trigger_type: normalizedTriggerType,
        trigger_value,
        disruption_hours: 3,
        severity_factor: severity,
        event_id: event.event_id,
        reason: reason || null,
      }, {
        headers: { 'x-internal-service-key': INTERNAL_SERVICE_KEY },
      });

      res.status(201).json({
        data: {
          ...event,
          city_id: targetCityId,
          zone_id: targetZoneId,
          trigger_scope: isCityWideTrigger ? 'CITY' : 'ZONE',
          claims_created: claimsRes.data.data?.length || 0,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (claimErr) {
      console.error('Auto-create claims error:', claimErr.message);
      res.status(500).json({ error: 'Failed to create claims', code: 'CLAIMS_CREATION_FAILED' });
    }
  } catch (err) {
    console.error('Trigger event error:', err);
    res.status(500).json({ error: 'Failed to create trigger event', code: 'TRIGGER_FAILED' });
  }
});

// =====================================================
// GET /api/admin/dashboard
// Get dashboard metrics using Supabase RPC or simple aggregates
// =====================================================
router.get('/dashboard', authMiddleware('admin'), async (req, res) => {
  try {
    // 1. Total Premiums
    const { data: premiumsData } = await supabase
      .from('policies')
      .select('premium_paid')
      .eq('status', 'ACTIVE');
    const totalPremiums = (premiumsData || []).reduce((sum, p) => sum + p.premium_paid, 0);

    // 2. Claims data (DB + fallback compatibility)
    const { data: dbClaims } = await supabase
      .from('claims')
      .select('claim_id, policy_id, trigger_event_id, status, final_payout, created_at');

    const fallbackClaims = claimStore.listFallbackClaims();
    const combinedClaims = dedupeClaims(dbClaims || [], fallbackClaims);

    // Treat all non-denied/non-closed claims as current liability so manual triggers
    // immediately affect payout/loss/reserve metrics.
    const liabilityStatuses = new Set([
      'AUTO_CREATED',
      'TRUST_EVALUATED',
      'APPROVED',
      'PARTIAL',
      'FLAGGED',
      'PAID',
    ]);

    const totalClaimLiability = combinedClaims
      .filter((claim) => liabilityStatuses.has(claim.status))
      .reduce((sum, claim) => sum + Number(claim.final_payout || 0), 0);

    const totalPayouts = Math.min(totalClaimLiability, totalPremiums);
    const reservePool = Math.max(0, totalPremiums - totalPayouts);
    const lossRatioPercent = totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0;

    // 3. Claims by Status
    const claimsByStatus = combinedClaims.reduce((acc, claim) => {
      const status = claim.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // 4. Recent Claims
    const { data: recentClaims } = await supabase
      .from('claims')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    const mergedRecentClaims = dedupeClaims(
      (recentClaims || []).map((claim) => ({ ...claim, synthetic_fallback: false })),
      fallbackClaims.map((claim) => ({ ...claim, profiles: claim.profiles || null, synthetic_fallback: true }))
    )
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);

    // 5. Claims Today (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const claimsTodayCount = combinedClaims.filter(
      (claim) => new Date(claim.created_at || 0) >= new Date(twentyFourHoursAgo)
    ).length;

    res.json({
      data: {
        total_premiums_collected: totalPremiums,
        total_payouts: totalPayouts,
        reserve_pool: reservePool,
        total_claim_liability: totalClaimLiability,
        unreserved_claim_liability: Math.max(0, totalClaimLiability - totalPremiums),
        loss_ratio_percent: lossRatioPercent,
        claims_today: claimsTodayCount,
        claims_by_status: claimsByStatus,
        recent_claims: mergedRecentClaims,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard', code: 'DASHBOARD_FETCH_FAILED' });
  }
});

// =====================================================
// POST /api/admin/seed-demo-worker
// Seed one active worker + policy for end-to-end demos
// =====================================================
router.post('/seed-demo-worker', authMiddleware('admin'), async (req, res) => {
  let stage = 'init';
  try {
    const zoneId = req.body?.zone_id || 'zone_02';
    const now = Date.now();
    const email = req.body?.email || `demo.worker.${now}@gigcare.app`;
    const phone = req.body?.phone || `+9199${String(now).slice(-8)}`;

    const profileId = uuidv4();
    stage = 'create_profile';
    const created = await db.createProfile({
      id: profileId,
      full_name: req.body?.name || 'Demo Worker',
      email,
      phone,
      role: 'worker',
      platform: req.body?.platform || 'ZOMATO',
      zone_id: zoneId,
    });

    if (created.error) {
      throw created.error;
    }

    const profile = created.data;

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    stage = 'create_quote';
    const { data: quote, error: quoteError } = await supabase
      .from('premium_quotes')
      .insert({
        quote_id: uuidv4(),
        user_id: profileId,
        zone_id: zoneId,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        premium_rupees: Number(req.body?.premium_rupees || 145),
        expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (quoteError) {
      throw quoteError;
    }

    stage = 'create_policy';
    const { data: policy, error: policyError } = await db.createPolicy(
      profileId,
      req.body?.coverage_tier || 'STANDARD',
      quote.premium_rupees,
      Number(req.body?.max_payout || 1200),
      quote.week_start,
      quote.week_end
    );

    if (policyError) {
      throw policyError;
    }

    const createdPolicyId = policy.policy_id || policy.id;
    if (!createdPolicyId) {
      throw new Error('Unable to determine policy id for activation');
    }

    stage = 'activate_policy';
    const { data: activePolicy, error: activePolicyError } = await db.activatePolicy(
      createdPolicyId,
      `demo_payment_${Date.now()}`
    );

    if (activePolicyError) {
      throw activePolicyError;
    }

    res.status(201).json({
      data: {
        profile,
        quote,
        policy: {
          ...activePolicy,
          policy_id: activePolicy.policy_id || activePolicy.id,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error(`Seed demo worker error at ${stage}:`, err);
    res.status(500).json({ error: 'Failed to seed demo worker', code: 'SEED_DEMO_FAILED', stage });
  }
});

// =====================================================
// GET /api/admin/fraud-rings
// Fraud ring feed proxied from the fraud service
// =====================================================
router.get('/fraud-rings', authMiddleware('admin'), async (req, res) => {
  try {
    const response = await axios.get(`${FRAUD_SERVICE_URL}/rings`, { timeout: 5000 });
    res.json({
      data: response.data.data || [],
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Fraud rings fetch error:', err.message);
    res.json({
      data: [],
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// =====================================================
// GET /api/admin/eligibility-stats
// SS Code eligibility overview
// =====================================================
router.get('/eligibility-stats', authMiddleware('admin'), async (req, res) => {
  try {
    let stats = { eligible: 0, near_threshold: 0, ineligible: 0, total: 0 };

    try {
      const { data: workers, error } = await supabase
        .from('workers')
        .select('worker_id, engagement_days_this_fy, multi_platform, ss_code_eligible');

      if (error) {
        throw error;
      }

      stats = (workers || []).reduce(
        (acc, worker) => {
          const threshold = worker.multi_platform ? 120 : 90;
          const days = worker.engagement_days_this_fy || 0;

          if (worker.ss_code_eligible || days >= threshold) {
            acc.eligible += 1;
          } else if (threshold - days <= 15) {
            acc.near_threshold += 1;
          } else {
            acc.ineligible += 1;
          }

          return acc;
        },
        { eligible: 0, near_threshold: 0, ineligible: 0, total: (workers || []).length }
      );
    } catch (schemaError) {
      console.warn('Eligibility stats fallback:', schemaError.message);

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('role', 'worker');

      if (profileError) {
        throw profileError;
      }

      const now = Date.now();
      stats = (profiles || []).reduce(
        (acc, profile) => {
          const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : now;
          const days = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
          const threshold = 90;

          if (days >= threshold) {
            acc.eligible += 1;
          } else if (threshold - days <= 15) {
            acc.near_threshold += 1;
          } else {
            acc.ineligible += 1;
          }

          return acc;
        },
        { eligible: 0, near_threshold: 0, ineligible: 0, total: (profiles || []).length }
      );
    }

    res.json({
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Eligibility stats error:', err);
    res.status(500).json({ error: 'Failed to fetch eligibility stats', code: 'ELIGIBILITY_STATS_FAILED' });
  }
});

// =====================================================
// GET /api/admin/cities/metrics
// All-city comparison data for the India map dashboard
// =====================================================
router.get('/cities/metrics', authMiddleware('admin'), async (req, res) => {
  try {
    const [zonesResult, claimsResult] = await Promise.allSettled([
      supabase.from('zones').select('zone_id, zone_risk_score, zone_risk_level, city, name, lat, lon'),
      supabase.from('claims').select('zone_id, status, final_payout, created_at'),
    ]);

    const zones = zonesResult.status === 'fulfilled' && !zonesResult.value.error ? (zonesResult.value.data || []) : [];
    const claims = zonesResult.status === 'fulfilled' ? dedupeClaims(
      claimsResult.status === 'fulfilled' && !claimsResult.value.error ? (claimsResult.value.data || []) : [],
      claimStore.listFallbackClaims().map((claim) => ({
        ...claim,
        zone_id: claim.zone_id || null,
      }))
    ) : [];

    const zoneGroups = zones.reduce((acc, zone) => {
      const cityName = zone.city || 'Unknown';
      acc[cityName] = acc[cityName] || [];
      acc[cityName].push(zone);
      return acc;
    }, {});

    const claimGroups = claims.reduce((acc, claim) => {
      const matchingZone = zones.find((zone) => zone.zone_id === claim.zone_id);
      const cityName = matchingZone?.city || 'Unknown';
      acc[cityName] = acc[cityName] || [];
      acc[cityName].push(claim);
      return acc;
    }, {});

    // Fetch Profiles to map workers to cities
    const { data: profiles } = await supabase.from('profiles').select('id, zone_id');
    const { data: activePolicies } = await supabase.from('policies').select('user_id, premium_paid').eq('status', 'ACTIVE');

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p.zone_id;
      return acc;
    }, {});

    const cityMetrics = CITY_CONFIGS.map((city) => {
      const cityZones = zoneGroups[city.city_name] || [];
      const cityZoneIds = cityZones.map(z => z.zone_id);
      
      const cityClaims = (claims || []).filter(c => cityZoneIds.includes(c.zone_id));
      const recentClaims = cityClaims.filter((claim) => new Date(claim.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      const cityWorkerCount = (profiles || []).filter(p => cityZoneIds.includes(p.zone_id)).length;
      
      // Real policies aggregation
      const cityActivePolicies = (activePolicies || []).filter(p => cityZoneIds.includes(profileMap[p.user_id]));
      const totalPremiums = cityActivePolicies.reduce((sum, p) => sum + (p.premium_paid || 0), 0);
      const premiumValues = cityActivePolicies
        .map((p) => Number(p.premium_paid || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
      const minPremium = premiumValues.length ? Math.min(...premiumValues) : null;
      const maxPremium = premiumValues.length ? Math.max(...premiumValues) : null;
      const totalClaimLiability = cityClaims.reduce((sum, claim) => sum + Number(claim.final_payout || 0), 0);
      const totalPayouts = Math.min(totalClaimLiability, totalPremiums);
      const reservePool = Math.max(0, totalPremiums - totalPayouts);
      const lossRatio = totalPremiums > 0 ? Number((totalPayouts / totalPremiums).toFixed(2)) : 0;

      const avgRisk = cityZones.length
        ? cityZones.reduce((sum, zone) => sum + Number(zone.zone_risk_score || 1), 0) / cityZones.length
        : 1;

      return {
        city_id: city.city_id,
        city_name: city.city_name,
        state: city.state,
        climate_zone: city.climate_zone,
        active_workers_estimate: cityWorkerCount,
        active_policies: cityActivePolicies.length,
        zones_count: cityZones.length,
        average_risk: Number(avgRisk.toFixed(2)),
        this_week_claims: recentClaims.length,
        total_claims: cityClaims.length,
        total_payouts: totalPayouts,
        total_premiums: totalPremiums,
        total_claim_liability: totalClaimLiability,
        unreserved_claim_liability: Math.max(0, totalClaimLiability - totalPremiums),
        reserve_pool: reservePool,
        loss_ratio: lossRatio,
        premium_range: minPremium !== null ? `Rs.${Math.round(minPremium)}-${Math.round(maxPremium || minPremium)}` : 'No active policies',
      };
    });

    res.json({
      data: cityMetrics,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('City metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch city metrics', code: 'CITY_METRICS_FAILED' });
  }
});

// =====================================================
// GET /api/admin/forecast
// Lightweight next-week claims forecast
// =====================================================
router.get('/forecast', authMiddleware('admin'), async (req, res) => {
  try {
    const { data: claims, error } = await supabase
      .from('claims')
      .select('final_payout, created_at, city_id');

    if (error && error.code === 'PGRST205') {
      return res.json({
        data: {
          expected_claims_next_week: 0,
          forecast_delta: 0,
          basis: 'insufficient historical claims data',
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    if (error) {
      throw error;
    }

    const last7Days = (claims || []).filter((claim) => new Date(claim.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weeklyPayouts = last7Days.reduce((sum, claim) => sum + Number(claim.final_payout || 0), 0);
    const expectedClaimsNextWeek = Math.round(weeklyPayouts * 1.15);

    res.json({
      data: {
        expected_claims_next_week: expectedClaimsNextWeek,
        forecast_delta: Math.round(expectedClaimsNextWeek * 0.12),
        basis: '7-day payout trend',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch forecast', code: 'FORECAST_FAILED' });
  }
});

module.exports = router;
