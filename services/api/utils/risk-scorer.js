const axios = require('axios');
const supabase = require('../models/supabase');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0];
}

async function getHistoricalTriggerCount(zoneId) {
  const { count, error } = await supabase
    .from('trigger_events')
    .select('event_id', { count: 'exact', head: true })
    .eq('zone_id', zoneId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return 0;
  }

  return count || 0;
}

async function computeZoneRiskScore(zoneId, centroidLat, centroidLon, cityConfig = null) {
  const today = new Date();
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  let rainRisk = 1.0;
  let heatRisk = 1.0;

  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude: centroidLat,
        longitude: centroidLon,
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(today),
        daily: 'precipitation_sum,temperature_2m_max',
        timezone: 'Asia/Kolkata',
      },
      timeout: 10000,
    });

    const precipitation = response.data?.daily?.precipitation_sum || [];
    const temperatures = response.data?.daily?.temperature_2m_max || [];

    const heavyRainDays = precipitation.filter((value) => value !== null && value >= 50).length;
    const heatDays = temperatures.filter((value) => value !== null && value >= 40).length;

    const rainNormalization = {
      tropical_rainforest: 50,
      tropical_coastal: 35,
      tropical_savanna: 20,
      humid_subtropical: 15,
      semi_arid_tropical: 10,
      semi_arid: 8,
      arid: 4,
    };

    const heatNormalization = {
      tropical_rainforest: 20,
      tropical_coastal: 16,
      tropical_savanna: 15,
      humid_subtropical: 18,
      semi_arid_tropical: 20,
      semi_arid: 25,
      arid: 30,
    };

    const climateZone = cityConfig?.climate_zone || 'tropical_savanna';
    const rainNorm = rainNormalization[climateZone] || 15;
    const heatNorm = heatNormalization[climateZone] || 18;

    rainRisk = clamp((heavyRainDays / rainNorm) * 1.4 + 0.5, 0.5, 3.0);
    heatRisk = clamp((heatDays / heatNorm) * 1.1 + 0.4, 0.5, 2.0);
  } catch (error) {
    const defaults = {
      tropical_rainforest: 2.4,
      tropical_coastal: 1.8,
      tropical_savanna: 1.3,
      humid_subtropical: 1.5,
      semi_arid_tropical: 1.1,
      semi_arid: 0.9,
      arid: 0.7,
    };

    rainRisk = defaults[cityConfig?.climate_zone] || 1.0;
  }

  const triggerCount = await getHistoricalTriggerCount(zoneId);
  const triggerDensity = clamp(triggerCount / 20, 0, 1.0);

  const floodRisk = 1.0;
  const climateBoost = cityConfig?.climate_zone === 'tropical_rainforest' ? 0.2 : 0;

  const zoneRiskScore = clamp(
    rainRisk * 0.42 +
      heatRisk * 0.23 +
      floodRisk * 0.23 +
      triggerDensity * 0.12 +
      climateBoost,
    0.5,
    3.0
  );

  await supabase.from('zones').upsert(
    {
      zone_id: zoneId,
      zone_risk_score: zoneRiskScore,
      rain_risk_factor: rainRisk,
      heat_risk_factor: heatRisk,
      last_risk_computed: new Date().toISOString(),
      historical_trigger_days_365: triggerCount,
    },
    { onConflict: 'zone_id' }
  );

  return zoneRiskScore;
}

async function getCachedZoneRiskScore(zoneId) {
  const { data, error } = await supabase
    .from('zones')
    .select('zone_risk_score, last_risk_computed')
    .eq('zone_id', zoneId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.zone_risk_score;
}

module.exports = {
  computeZoneRiskScore,
  getCachedZoneRiskScore,
};