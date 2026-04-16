const express = require('express');
const supabase = require('../models/supabase');
const { authMiddleware } = require('../middleware/auth');
const { requireConsent, getConsentText } = require('../middleware/consent');
const { resolveUserLocation } = require('../utils/location-resolver');
const { checkSSCodeEligibility } = require('../utils/eligibility-engine');

const router = express.Router();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeConsentType(consentType) {
  return String(consentType || '').trim().toUpperCase();
}

async function fetchWorkerOrThrow(workerId) {
  const { data: worker, error } = await supabase
    .from('workers')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (error && error.code !== 'PGRST205') {
    throw error;
  }

  if (error && error.code === 'PGRST205') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', workerId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      const notFoundError = new Error('Worker not found');
      notFoundError.status = 404;
      notFoundError.code = 'WORKER_NOT_FOUND';
      throw notFoundError;
    }

    return {
      worker_id: profile.id,
      avg_daily_income: toNumber(profile.avg_daily_income, 650),
      zone_id: profile.zone_id,
      city_id: profile.city_id || null,
      location_mode: profile.location_mode || null,
      district: profile.district || null,
      state: profile.state || null,
    };
  }

  if (!worker) {
    const notFoundError = new Error('Worker not found');
    notFoundError.status = 404;
    notFoundError.code = 'WORKER_NOT_FOUND';
    throw notFoundError;
  }

  return worker;
}

router.get('/:id/income-recovery', authMiddleware('worker'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const worker = await fetchWorkerOrThrow(id);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: claims, error } = await supabase
      .from('claims')
      .select('final_payout, disruption_hours, created_at, status')
      .eq('worker_id', id)
      .eq('status', 'PAID')
      .gte('created_at', monthStart.toISOString());

    if (error && error.code !== 'PGRST205') {
      throw error;
    }

    const safeClaims = error && error.code === 'PGRST205' ? [] : (claims || []);

    const totalPaid = safeClaims.reduce((sum, claim) => sum + toNumber(claim.final_payout), 0);
    const totalLost = safeClaims.reduce((sum, claim) => {
      const hourlyRate = toNumber(worker.avg_daily_income, 650) / 8;
      return sum + hourlyRate * toNumber(claim.disruption_hours, 0);
    }, 0);

    const recoveryPct = totalLost > 0 ? totalPaid / totalLost : 0;

    res.json({
      data: {
        worker_id: id,
        total_paid: Math.round(totalPaid),
        total_lost: Math.round(totalLost),
        recovery_pct: Number(recoveryPct.toFixed(2)),
        claims_count: safeClaims.length,
        month_start: monthStart.toISOString().split('T')[0],
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Income recovery error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to fetch income recovery',
      code: err.code || 'INCOME_RECOVERY_FAILED',
    });
  }
});

router.get('/:id/eligibility', authMiddleware('worker'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const eligibility = await checkSSCodeEligibility(id);
    res.json({
      data: eligibility,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Eligibility fetch error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to fetch eligibility',
      code: err.code || 'ELIGIBILITY_FETCH_FAILED',
    });
  }
});

router.post('/:id/location', authMiddleware('worker'), requireConsent('GPS_LOCATION'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const { lat, lon } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(422).json({
        error: 'Invalid or missing coordinates',
        code: 'INVALID_COORDINATES',
      });
    }

    const location = await resolveUserLocation(latitude, longitude);
    const updates = {
      location_mode: location.mode,
      district: location.district || location.city || null,
      state: location.state || null,
      city_id: location.city_id || location.nearest_city_id || null,
      updated_at: new Date().toISOString(),
    };

    if (location.mode === 'SUPPORTED_CITY') {
      updates.zone_id = location.zone_id;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        zone_id: updates.zone_id,
        last_known_latitude: latitude,
        last_known_longitude: longitude,
        location_verified: true
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      data: {
        worker_id: profile.id,
        location_mode: profile.location_mode,
        city_id: profile.city_id,
        district: profile.district,
        state: profile.state,
        zone_id: profile.zone_id,
        location,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Location cache error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to store location',
      code: err.code || 'LOCATION_CACHE_FAILED',
    });
  }
});

router.post('/:id/consent/:type', authMiddleware('worker'), async (req, res) => {
  try {
    const { id, type } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const consentType = normalizeConsentType(type);
    const consentGranted = Boolean(req.body?.granted);
    const consentText = req.body?.consent_text || getConsentText(consentType);

    if (!consentText) {
      return res.status(422).json({ error: 'Unsupported consent type', code: 'INVALID_CONSENT_TYPE' });
    }

    const { data: existingRecord, error: fetchError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('worker_id', id)
      .eq('consent_type', consentType)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    const payload = {
      worker_id: id,
      consent_type: consentType,
      consent_granted: consentGranted,
      consent_text: consentText,
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
      granted_at: consentGranted ? new Date().toISOString() : existingRecord?.granted_at || new Date().toISOString(),
      revoked_at: consentGranted ? null : new Date().toISOString(),
    };

    const { data: record, error } = await supabase
      .from('consent_records')
      .upsert(payload, { onConflict: 'worker_id,consent_type' })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      data: record,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Consent update error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to store consent',
      code: err.code || 'CONSENT_STORE_FAILED',
    });
  }
});

router.get('/:id/consents', authMiddleware('worker'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const { data: consents, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('worker_id', id)
      .order('granted_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      data: consents || [],
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Consent fetch error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to fetch consents',
      code: err.code || 'CONSENT_FETCH_FAILED',
    });
  }
});

router.post('/:id/transfer-city', authMiddleware('worker'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.user_id !== id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const { city_id, district, state, location_mode = 'FALLBACK', zone_id } = req.body;

    if (!city_id && location_mode === 'SUPPORTED_CITY') {
      return res.status(422).json({ error: 'Missing city_id', code: 'MISSING_FIELDS' });
    }

    const updates = {
      city_id: city_id || null,
      district: district || null,
      state: state || null,
      location_mode,
      updated_at: new Date().toISOString(),
    };

    if (zone_id) {
      updates.zone_id = zone_id;
    }

    const { data: worker, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('worker_id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      data: worker,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Transfer city error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Failed to transfer city',
      code: err.code || 'TRANSFER_CITY_FAILED',
    });
  }
});

module.exports = router;