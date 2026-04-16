const axios = require('axios');

const DEFAULT_SEASONAL_MULTIPLIERS = {
  1: 0.85,
  2: 0.85,
  3: 0.95,
  4: 1.10,
  5: 1.20,
  6: 1.45,
  7: 1.50,
  8: 1.50,
  9: 1.35,
  10: 1.05,
  11: 0.90,
  12: 0.85,
};

const CHENNAI_SEASONAL_MULTIPLIERS = {
  1: 0.85,
  2: 0.85,
  3: 0.90,
  4: 1.00,
  5: 1.10,
  6: 1.15,
  7: 1.10,
  8: 1.10,
  9: 1.20,
  10: 1.45,
  11: 1.50,
  12: 1.40,
};

const CITY_BASE_PREMIUMS = {
  BLR: 145,
  MUM: 200,
  DEL: 155,
  CHN: 170,
  HYD: 132,
  PUN: 120,
  KOL: 175,
  AMD: 110,
  JAI: 84,
  KOC: 212,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSeasonalMultiplier(month, cityId) {
  const seasonalMap = cityId === 'CHN' ? CHENNAI_SEASONAL_MULTIPLIERS : DEFAULT_SEASONAL_MULTIPLIERS;
  return seasonalMap[month] || 1.0;
}

function applySeasonalGuard(basePremium, month, cityId) {
  return Math.round(basePremium * getSeasonalMultiplier(month, cityId));
}

function applyRedAlertSurcharge(basePremium, redAlertIssued) {
  if (redAlertIssued) {
    return null;
  }

  return basePremium;
}

function getFallbackTierMultiplier(tier) {
  const tierMultipliers = {
    TIER_1: 1.3,
    TIER_2: 1.0,
    TIER_3: 0.85,
    TIER_4: 0.75,
  };

  return tierMultipliers[tier] || 1.0;
}

function getBasePremiumForCity(cityId) {
  return CITY_BASE_PREMIUMS[cityId] || 140;
}

function estimatePremium({ basePremium, month, cityId, redAlertIssued = false, fallbackTier = null }) {
  const guardedPremium = applyRedAlertSurcharge(basePremium, redAlertIssued);

  if (guardedPremium === null) {
    return null;
  }

  const seasonalPremium = applySeasonalGuard(guardedPremium, month, cityId);
  return Math.round(seasonalPremium * getFallbackTierMultiplier(fallbackTier));
}

async function checkEnrollmentLock(centroidLat, centroidLon) {
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: centroidLat,
        longitude: centroidLon,
        hourly: 'precipitation_probability,precipitation',
        forecast_days: 2,
        timezone: 'Asia/Kolkata',
      },
      timeout: 6000,
    });

    const probabilities = response.data?.hourly?.precipitation_probability || [];
    const rainfall = response.data?.hourly?.precipitation || [];

    const maxProbability = probabilities.reduce((max, value) => Math.max(max, Number(value || 0)), 0);
    const totalRainfall = rainfall.reduce((sum, value) => sum + Number(value || 0), 0);

    if (maxProbability >= 80 && totalRainfall > 40) {
      return {
        locked: true,
        reason: 'Adverse selection lock: heavy rain forecast within 48 hours',
        expected_rain_mm: Number(totalRainfall.toFixed(1)),
        rain_prob_48h: Number((maxProbability / 100).toFixed(2)),
      };
    }

    return {
      locked: false,
      reason: null,
      expected_rain_mm: Number(totalRainfall.toFixed(1)),
      rain_prob_48h: Number((maxProbability / 100).toFixed(2)),
    };
  } catch (error) {
    return {
      locked: false,
      reason: 'Forecast unavailable; defaulting to open enrollment',
      expected_rain_mm: 0,
      rain_prob_48h: 0,
    };
  }
}

module.exports = {
  applySeasonalGuard,
  applyRedAlertSurcharge,
  checkEnrollmentLock,
  estimatePremium,
  getFallbackTierMultiplier,
  getBasePremiumForCity,
  getSeasonalMultiplier,
};