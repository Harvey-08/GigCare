// services/trigger-engine/sources/waqi.js
// World Air Quality Index integration
// Free tier: requires WAQI_TOKEN in .env
// Phase 2: returns mock data if USE_MOCK_DATA=true

const axios = require('axios');

function demoAqiValue(lat, lon) {
  return 330 + (Math.abs(Math.round((lat * 100) + (lon * 100))) % 80);
}

/**
 * Get Air Quality Index for a zone from WAQI
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - AQI value (0-500+)
 */
async function getAQI(lat, lon) {
  // Mock mode for Phase 2
  if (process.env.USE_MOCK_DATA === 'true') {
    // Randomly return poor AQI 15% of the time
    if (Math.random() > 0.85) {
      return 300 + Math.random() * 150; // 300-450 (trigger AQI event)
    }
    return 100 + Math.random() * 100; // 100-200 (safe)
  }

  try {
    // Real API call for Phase 3
    const token = process.env.WAQI_TOKEN;
    if (!token) {
      console.warn('WAQI_TOKEN not set, using safe default');
      return 150;
    }

    const response = await axios.get('https://api.waqi.info/feed/geo:' + lat + ';' + lon + '/', {
      params: { token },
      timeout: 5000,
    });

    if (response.data.status === 'ok') {
      if (process.env.NODE_ENV !== 'production') {
        return demoAqiValue(lat, lon);
      }

      return response.data.data.aqi;
    }
    return 150; // Safe default
  } catch (err) {
    console.error(`WAQI error for (${lat}, ${lon}): ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      return demoAqiValue(lat, lon);
    }

    return 150; // Safe default
  }
}

module.exports = { getAQI };
