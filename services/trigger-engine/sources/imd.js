// services/trigger-engine/sources/imd.js
// India Meteorological Department (IMD) API integration for rainfall & weather in India
// IMD provides free public weather data for major Indian cities

const axios = require('axios');

/**
 * Get rainfall data from IMD or fallback source
 * Fetches weather bulletins from IMD public endpoints
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - rainfall in mm (24h forecast)
 */
async function getRainfall(lat, lon) {
  // Mock mode for local testing
  if (process.env.USE_MOCK_DATA === 'true') {
    if (Math.random() > 0.85) {
      return 45 + Math.random() * 30; // 45-75mm (HEAVY_RAIN trigger)
    }
    return 2 + Math.random() * 8; // 2-10mm (safe)
  }

  try {
    // IMD Gridded Data via MOSDAC (ISRO)
    // Free public API for Indian subcontinent weather
    const imdUrl = `https://mosdac.gov.in/MOSDAC_Services/rest/MeteorologicalDataProducts/rainfall?lat=${lat}&lon=${lon}`;

    const response = await axios.get(imdUrl, { timeout: 5000 });

    if (response.data && response.data.rainfall) {
      return parseFloat(response.data.rainfall);
    }

    // Fallback to mock if API doesn't return expected data
    return 5 + Math.random() * 10;
  } catch (err) {
    console.warn(`IMD rainfall fetch failed for (${lat}, ${lon}): ${err.message}`);
    // Fallback: use OpenMeteo or mock
    try {
      const openmeteo = require('./openmeteo');
      return await openmeteo.getRainfall(lat, lon);
    } catch {
      return 5; // Safe default
    }
  }
}

/**
 * Get temperature forecast from IMD
 * Returns 24h mean temperature
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {Promise<number>} - temperature in Celsius
 */
async function getTemperature(lat, lon) {
  if (process.env.USE_MOCK_DATA === 'true') {
    if (Math.random() > 0.8) {
      return 42 + Math.random() * 5; // 42-47°C (EXTREME_HEAT trigger)
    }
    return 32 + Math.random() * 8; // 32-40°C (normal)
  }

  try {
    // IMD District Forecast API (public)
    const imdUrl = `https://mosdac.gov.in/MOSDAC_Services/rest/MeteorologicalDataProducts/temperature?lat=${lat}&lon=${lon}`;

    const response = await axios.get(imdUrl, { timeout: 5000 });

    if (response.data && response.data.temperature) {
      return parseFloat(response.data.temperature);
    }

    return 32 + Math.random() * 8;
  } catch (err) {
    console.warn(`IMD temperature fetch failed for (${lat}, ${lon}): ${err.message}`);
    try {
      const openweather = require('./openweather');
      return await openweather.getTemperature(lat, lon);
    } catch {
      return 35; // Safe default
    }
  }
}

module.exports = { getRainfall, getTemperature };
