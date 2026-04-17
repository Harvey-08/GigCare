// services/api/routes/zones.js
// Zone endpoints - Person A

const express = require('express');
const db = require('../models/db');
const supabase = require('../models/supabase');
const { CITY_CONFIGS } = require('../config/cities');
const { resolveUserLocation } = require('../utils/location-resolver');
const { computeZoneRiskScore } = require('../utils/risk-scorer');
const { estimatePremium, getBasePremiumForCity, checkEnrollmentLock } = require('../utils/premium-calculator');

const router = express.Router();

async function ensureSupportedCityZone(gridCell, cityConfig) {
  const { data: existingZone, error: fetchError } = await supabase
    .from('zones')
    .select('*')
    .eq('zone_id', gridCell.zone_id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingZone) {
    return existingZone;
  }

  const { data: insertedZone, error: insertError } = await supabase
    .from('zones')
    .insert({
      zone_id: gridCell.zone_id,
      name: `${cityConfig.city_name} Grid ${gridCell.row}-${gridCell.col}`,
      city: cityConfig.city_name,
      lat: gridCell.centroid_lat,
      lon: gridCell.centroid_lon,
      zone_risk_score: 1.0,
      zone_risk_level: 'MEDIUM',
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedZone;
}

async function ensureFallbackCityZone(cityConfig) {
  const fallbackZoneId = `${cityConfig.city_id}_CENTROID`;

  const { data: existingZone, error: fetchError } = await supabase
    .from('zones')
    .select('*')
    .eq('zone_id', fallbackZoneId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingZone) {
    return existingZone;
  }

  const { data: insertedZone, error: insertError } = await supabase
    .from('zones')
    .insert({
      zone_id: fallbackZoneId,
      name: cityConfig.city_name,
      city: cityConfig.city_name,
      lat: cityConfig.centroid_lat,
      lon: cityConfig.centroid_lon,
      zone_risk_score: 1.0,
      zone_risk_level: 'MEDIUM',
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedZone;
}

// GET /api/zones/resolve?lat=X&lon=Y
router.get('/resolve', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(422).json({
        error: 'Invalid or missing coordinates',
        code: 'INVALID_COORDINATES',
      });
    }

    const location = await resolveUserLocation(lat, lon);

    if (location.mode === 'SUPPORTED_CITY') {
      const zoneRow = await ensureSupportedCityZone(location.gridCell, location.cityConfig);
      const zoneRiskScore =
        zoneRow.zone_risk_score
          ? zoneRow.zone_risk_score
          : await computeZoneRiskScore(zoneRow.zone_id, zoneRow.lat || location.centroid_lat, zoneRow.lon || location.centroid_lon, location.cityConfig);

      const month = new Date().getMonth() + 1;
      const riskAdjustedBasePremium = Math.round(
        getBasePremiumForCity(location.city_id) * Math.max(0.65, Math.min(1.55, zoneRiskScore / 1.4))
      );
      const premiumEstimate = estimatePremium({
        basePremium: riskAdjustedBasePremium,
        month,
        cityId: location.city_id,
      });

      return res.json({
        data: {
          ...location,
          zone_name: zoneRow.name,
          zone_risk_score: zoneRiskScore,
          premium_estimate: premiumEstimate,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const month = new Date().getMonth() + 1;
    const nearestCityId = location.nearest_city_id || 'BLR';
    const nearestCityConfig = CITY_CONFIGS.find((city) => city.city_id === nearestCityId) || CITY_CONFIGS[0];
    const zoneRow = await ensureFallbackCityZone(nearestCityConfig);
    const zoneRiskScore =
      zoneRow.zone_risk_score
        ? zoneRow.zone_risk_score
        : await computeZoneRiskScore(zoneRow.zone_id, zoneRow.lat || nearestCityConfig.centroid_lat, zoneRow.lon || nearestCityConfig.centroid_lon, nearestCityConfig);
    const premiumEstimate = estimatePremium({
      basePremium: getBasePremiumForCity(nearestCityId),
      month,
      cityId: nearestCityId,
      fallbackTier: 'TIER_2',
    });

    return res.json({
      data: {
        ...location,
        zone_id: zoneRow.zone_id,
        zone_name: zoneRow.name,
        zone_risk_score: zoneRiskScore,
        premium_estimate: premiumEstimate,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Location resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve location', code: 'LOCATION_RESOLVE_FAILED' });
  }
});

// GET /api/zones/heatmap - lightweight zone risk view for admin dashboard
router.get('/heatmap', async (req, res) => {
  try {
    const { data: zones, error } = await supabase
      .from('zones')
      .select('zone_id, name, city, zone_risk_score, zone_risk_level, lat, lon')
      .order('city', { ascending: true })
      .order('zone_risk_score', { ascending: false, nullsFirst: false });

    if (error) {
      throw error;
    }

    res.json({
      data: zones || [],
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zone heatmap error:', err);
    res.status(500).json({ error: 'Failed to fetch zone heatmap', code: 'ZONE_HEATMAP_FAILED' });
  }
});

// GET /api/zones/:zone_id/status - live zone status for worker dashboard
router.get('/:zone_id/status', async (req, res) => {
  try {
    const { data: zone, error } = await supabase
      .from('zones')
      .select('*')
      .eq('zone_id', req.params.zone_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }

    const centroidLat = Number(zone.centroid_lat || zone.lat || 0);
    const centroidLon = Number(zone.centroid_lon || zone.lon || 0);
    const zoneRiskScore = zone.zone_risk_score && zone.last_risk_computed
      ? zone.zone_risk_score
      : await computeZoneRiskScore(zone.zone_id, centroidLat, centroidLon, CITY_CONFIGS.find((city) => city.city_name === zone.city) || null);
    const lockStatus = await checkEnrollmentLock(centroidLat, centroidLon);

    res.json({
      data: {
        zone_id: zone.zone_id,
        zone_name: zone.name,
        city: zone.city,
        zone_risk_score: zoneRiskScore,
        flood_prone: zone.flood_prone,
        locked: lockStatus.locked,
        reason: lockStatus.reason,
        expected_rain_mm: lockStatus.expected_rain_mm,
        rain_prob_48h: lockStatus.rain_prob_48h,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zone status error:', err);
    res.status(500).json({ error: 'Failed to fetch zone status', code: 'ZONE_STATUS_FAILED' });
  }
});

// GET /api/zones/:zone_id/forecast - near-term zone forecast and premium anchor
router.get('/:zone_id/forecast', async (req, res) => {
  try {
    const { data: zone, error } = await supabase
      .from('zones')
      .select('*')
      .eq('zone_id', req.params.zone_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }

    const centroidLat = Number(zone.lat || 0);
    const centroidLon = Number(zone.lon || 0);
    const lockStatus = await checkEnrollmentLock(centroidLat, centroidLon);
    const cityId = CITY_CONFIGS.find((city) => city.city_name === zone.city)?.city_id || 'BLR';
    const basePremium = getBasePremiumForCity(cityId);
    const premiumEstimate = estimatePremium({ basePremium, month: new Date().getMonth() + 1, cityId });

    res.json({
      data: {
        zone_id: zone.zone_id,
        city_id: cityId,
        city: zone.city,
        expected_rain_mm: lockStatus.expected_rain_mm,
        rain_prob_48h: lockStatus.rain_prob_48h,
        locked: lockStatus.locked,
        premium_estimate: premiumEstimate,
        forecast_message: lockStatus.locked
          ? 'New policies are temporarily paused in this zone.'
          : 'Coverage remains open for this zone.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zone forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch zone forecast', code: 'ZONE_FORECAST_FAILED' });
  }
});

// GET /api/zones - List all zones
router.get('/', async (req, res) => {
  try {
    const { data: zones, error } = await db.getZones();
    if (error) throw error;
    res.json({
      data: zones,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zones fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch zones', code: 'ZONES_FETCH_FAILED' });
  }
});

// GET /api/zones/:zone_id/risk - Get zone risk details
router.get('/:zone_id/risk', async (req, res) => {
  try {
    const { data: zone, error } = await db.getZone(req.params.zone_id);
    if (error) throw error;
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }
    
    res.json({
      data: {
        zone_id: zone.zone_id,
        name: zone.name,
        zone_risk_score: zone.zone_risk_score,
        zone_risk_level: zone.zone_risk_level,
        historical_claim_rate: 0.15, // mock
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zone risk fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch zone risk', code: 'ZONE_RISK_FETCH_FAILED' });
  }
});

module.exports = router;
