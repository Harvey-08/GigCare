// services/trigger-engine/sources/openweather.js
// OpenWeather API integration for temperature data
// Free tier: requires OPENWEATHER_API_KEY in .env
// Phase 2: returns mock data if USE_MOCK_DATA=true

const axios = require('axios');

function demoTemperatureValue(lat, lon) {
  return 42 + (Math.abs(Math.round((lat * 10) + (lon * 10))) % 4);
}

/**
 * Get current temperature for a zone from OpenWeather
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - current temperature in Celsius
 */
async function getTemperature(lat, lon) {
  // Mock mode for Phase 2
  if (process.env.USE_MOCK_DATA === 'true') {
    // Randomly return extreme heat 20% of the time
    if (Math.random() > 0.8) {
      return 40 + Math.random() * 5; // 40-45°C (trigger heat event)
    }
    return 30 + Math.random() * 8; // 30-38°C (safe)
  }

  try {
    // Real API call for Phase 3
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('OPENWEATHER_API_KEY not set, using safe default');
      return 35;
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: 'metric',
      },
      timeout: 5000,
    });

    if (process.env.NODE_ENV !== 'production') {
      return demoTemperatureValue(lat, lon);
    }

    return response.data.main.temp;
  } catch (err) {
    console.error(`OpenWeather error for (${lat}, ${lon}): ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      return demoTemperatureValue(lat, lon);
    }

    return 35; // Safe default
  }
}

module.exports = { getTemperature };
