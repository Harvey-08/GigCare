// services/trigger-engine/sources/cpcb.js
// Central Pollution Control Board (CPCB) AQI data integration
// CPCB provides Air Quality Index data for Indian cities

const axios = require('axios');

/**
 * Get Air Quality Index from CPCB or fallback
 * CPCB updates air quality data in real-time
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - AQI value (0-500+)
 */
async function getAQI(lat, lon) {
  if (process.env.USE_MOCK_DATA === 'true') {
    // Randomly trigger POOR_AQI events 15% of the time
    if (Math.random() > 0.85) {
      return 250 + Math.random() * 100; // 250-350 (POOR_AQI trigger)
    }
    return 50 + Math.random() * 80; // 50-130 (moderate/good)
  }

  try {
    // CPCB AQI Public Data (requires CPCB_API_KEY)
    const apiKey = process.env.CPCB_API_KEY || '';
    
    // CPCB endpoint for AQI data
    const cpcbUrl = 'https://api.cpcb.gov.in/aqi/get-aqi-nearest-station';

    const response = await axios.get(cpcbUrl, {
      params: {
        lat,
        lon,
        api_key: apiKey,
      },
      timeout: 5000,
    });

    if (response.data && response.data.aqi) {
      return parseFloat(response.data.aqi);
    }

    // Fallback AQI value
    return 120;
  } catch (err) {
    console.warn(`CPCB AQI fetch failed for (${lat}, ${lon}): ${err.message}`);

    // Fallback to WAQI if CPCB is unavailable
    try {
      const waqi = require('./waqi');
      return await waqi.getAQI(lat, lon);
    } catch {
      return 120; // Safe default (Moderate range)
    }
  }
}

module.exports = { getAQI };
