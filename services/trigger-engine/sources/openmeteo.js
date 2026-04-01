// services/trigger-engine/sources/openmeteo.js
// Open-Meteo API integration for rainfall data
// Free tier: no API key required
// Phase 2: returns mock data if USE_MOCK_DATA=true

const axios = require('axios');

/**
 * Get rainfall for a zone from Open-Meteo
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - rainfall in mm
 */
async function getRainfall(lat, lon) {
  // Mock mode for Phase 2
  if (process.env.USE_MOCK_DATA === 'true') {
    // Randomly return high rainfall 30% of the time
    if (Math.random() > 0.7) {
      return 50 + Math.random() * 50; // 50-100mm (trigger rain event)
    }
    return 5 + Math.random() * 15; // 5-20mm (safe)
  }

  try {
    // Real API call for Phase 3
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'precipitation',
        timezone: 'Asia/Kolkata',
      },
      timeout: 5000,
    });

    const data = response.data.hourly.precipitation;
    const rainfall = data.reduce((a, b) => a + b, 0) / data.length;
    return rainfall;
  } catch (err) {
    console.error(`OpenMeteo error for (${lat}, ${lon}): ${err.message}`);
    return 0; // Safe default
  }
}

module.exports = { getRainfall };
