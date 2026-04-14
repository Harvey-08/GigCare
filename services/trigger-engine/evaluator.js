// services/trigger-engine/evaluator.js
// Evaluate all triggers and dispatch claims - Person C

const axios = require('axios');
const db = require('./models/db'); // Localized DB client

// Zone definitions
const ZONES = [
  { zone_id: 'zone_01', name: 'Koramangala', lat: 12.9352, lon: 77.6245 },
  { zone_id: 'zone_02', name: 'Whitefield', lat: 12.9698, lon: 77.7499 },
  { zone_id: 'zone_03', name: 'Indiranagar', lat: 12.9716, lon: 77.6412 },
  { zone_id: 'zone_04', name: 'HSR Layout', lat: 12.9151, lon: 77.6398 },
  { zone_id: 'zone_05', name: 'Bommanahalli', lat: 12.9010, lon: 77.6182 },
];

// Mock data sources (replace with real API calls in Phase 3)
async function getRainfall(lat, lon) {
  // Mock rainfall: 50-70mm if mock mode, else call Open-Meteo
  if (process.env.USE_MOCK_DATA === 'true') {
    return Math.random() > 0.7 ? 60 : 20;
  }
  return 20; // Safe default
}

async function getTemperature(lat, lon) {
  // Mock temp: 40-42°C if mock mode, else call OpenWeather
  if (process.env.USE_MOCK_DATA === 'true') {
    return Math.random() > 0.8 ? 41 : 36;
  }
  return 36; // Safe default
}

async function getAQI(lat, lon) {
  // Mock AQI: 300-350 if mock mode, else call WAQI
  if (process.env.USE_MOCK_DATA === 'true') {
    return Math.random() > 0.85 ? 320 : 200;
  }
  return 200; // Safe default
}

// =====================================================
// MAIN EVALUATOR
// =====================================================
async function evaluateAllTriggers() {
  const firedEvents = [];
  const now = new Date();

  console.log('📊 Evaluating all triggers...');

  for (const zone of ZONES) {
    console.log(`  Checking ${zone.name}...`);

    // =====================================================
    // TRIGGER 1: Heavy Rain (>= 50mm)
    // =====================================================
    const rain = await getRainfall(zone.lat, zone.lon);
    if (rain >= 50) {
      const orderDrop = 0.45 + Math.random() * 0.15; // Simulate 30-60% drop
      if (orderDrop > 0.4) {
        console.log(`    ☔ Heavy rain ${rain}mm + ${(orderDrop * 100).toFixed(0)}% order drop`);
        const event = {
          zone_id: zone.zone_id,
          trigger_type: 'HEAVY_RAIN',
          trigger_value: rain,
          severity_factor: 1.3,
          peak_multiplier: now.getHours() >= 18 && now.getHours() <= 21 ? 1.2 : 1.0,
          event_id: null,
        };
        // Call API to create claims
        await dispatchClaims(event);
        firedEvents.push(event);
      }
    }

    // =====================================================
    // TRIGGER 2: Extreme Heat (>= 40°C)
    // =====================================================
    const temp = await getTemperature(zone.lat, zone.lon);
    if (temp >= 40) {
      console.log(`    🔥 Heat wave ${temp}°C`);
      const event = {
        zone_id: zone.zone_id,
        trigger_type: 'EXTREME_HEAT',
        trigger_value: temp,
        severity_factor: 1.0,
        peak_multiplier: 1.0,
        event_id: null,
      };
      await dispatchClaims(event);
      firedEvents.push(event);
    }

    // =====================================================
    // TRIGGER 3: Poor AQI (>= 300)
    // =====================================================
    const aqi = await getAQI(zone.lat, zone.lon);
    if (aqi >= 300) {
      const severity = aqi >= 400 ? 1.5 : 1.0;
      console.log(`    😷 Poor AQI ${aqi} (severity: ${severity})`);
      const event = {
        zone_id: zone.zone_id,
        trigger_type: 'POOR_AQI',
        trigger_value: aqi,
        severity_factor: severity,
        peak_multiplier: 1.0,
        event_id: null,
      };
      await dispatchClaims(event);
      firedEvents.push(event);
    }
  }

  return firedEvents;
}

// =====================================================
// DISPATCH CLAIMS: Call API to auto-create claims
// =====================================================
async function dispatchClaims(event) {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const internalKey = process.env.INTERNAL_SERVICE_KEY;

    const response = await axios.post(`${apiUrl}/api/claims/auto-create`, event, {
      headers: { 'x-internal-service-key': internalKey },
      timeout: 5000,
    });

    console.log(`      ✅ Created ${response.data.data?.length || 0} claims`);
  } catch (err) {
    console.error(`      ❌ Failed to dispatch claims: ${err.message}`);
  }
}

module.exports = {
  evaluateAllTriggers,
  dispatchClaims,
};
