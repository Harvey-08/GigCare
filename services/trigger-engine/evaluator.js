// services/trigger-engine/evaluator.js
// Evaluate all triggers and dispatch claims - Person C
// Phase 3: Uses IMD + CPCB for India-specific weather data

const { dispatchClaims } = require('./claim-dispatcher');
const { CITY_CONFIGS } = require('./config/cities');
const { latLonToGridCell } = require('./utils/geogrid');
const imd = require('./sources/imd');
const cpcb = require('./sources/cpcb');
const openmeteo = require('./sources/openmeteo');
const openweather = require('./sources/openweather');
const waqi = require('./sources/waqi');
const social = require('./sources/social');

// =====================================================
// MAIN EVALUATOR
// =====================================================
async function evaluateAllTriggers() {
  const firedEvents = [];
  const now = new Date();

  console.log('📊 Evaluating all triggers (Phase 3 - IMD/CPCB enabled)...');

  for (const city of CITY_CONFIGS) {
    const gridCell = latLonToGridCell(city.centroid_lat, city.centroid_lon, city);
    console.log(`  Checking ${city.city_name}...`);

    // =====================================================
    // TRIGGER 1: Heavy Rain (>= 50mm)
    // Phase 3: Primary source = IMD (India Meteorological Department)
    // =====================================================
    const rain = await imd.getRainfall(city.centroid_lat, city.centroid_lon);
    if (rain >= 50) {
      const orderDrop = 0.45 + Math.random() * 0.15; // Simulate 30-60% drop
      if (orderDrop > 0.4) {
        console.log(`    ☔ Heavy rain ${rain}mm (IMD) + ${(orderDrop * 100).toFixed(0)}% order drop`);
        const event = {
          city_id: city.city_id,
          zone_id: gridCell.zone_id,
          city_name: city.city_name,
          trigger_type: 'HEAVY_RAIN',
          trigger_value: rain,
          severity_factor: 1.3,
          peak_multiplier: now.getHours() >= 18 && now.getHours() <= 21 ? 1.2 : 1.0,
          event_id: null,
          data_source: 'IMD',
        };
        // Call API to create claims
        await dispatchClaims(event);
        firedEvents.push(event);
      }
    }

    // =====================================================
    // TRIGGER 2: Extreme Heat (>= 40°C)
    // Phase 3: Primary source = IMD temperature forecast
    // =====================================================
    const temp = await imd.getTemperature(city.centroid_lat, city.centroid_lon);
    if (temp >= 40) {
      console.log(`    🔥 Heat wave ${temp}°C (IMD)`);
      const event = {
        city_id: city.city_id,
        zone_id: gridCell.zone_id,
        city_name: city.city_name,
        trigger_type: 'EXTREME_HEAT',
        trigger_value: temp,
        severity_factor: 1.0,
        peak_multiplier: 1.0,
        event_id: null,
        data_source: 'IMD',
      };
      await dispatchClaims(event);
      firedEvents.push(event);
    }

    // =====================================================
    // TRIGGER 3: Poor AQI (>= 300)
    // Phase 3: Primary source = CPCB (Central Pollution Control Board)
    // =====================================================
    const aqi = await cpcb.getAQI(city.centroid_lat, city.centroid_lon);
    if (aqi >= 300) {
      const severity = aqi >= 400 ? 1.5 : 1.0;
      console.log(`    😷 Poor AQI ${aqi} (CPCB, severity: ${severity})`);
      const event = {
        city_id: city.city_id,
        zone_id: gridCell.zone_id,
        city_name: city.city_name,
        trigger_type: 'POOR_AQI',
        trigger_value: aqi,
        severity_factor: severity,
        peak_multiplier: 1.0,
        event_id: null,
        data_source: 'CPCB',
      };
      await dispatchClaims(event);
      firedEvents.push(event);
    }

    // =====================================================
    // TRIGGER 4/5: Social disruptions (curfew / app outage)
    // =====================================================
    const socialEvent = social.getSocialDisruption(city.city_id);
    if (socialEvent) {
      console.log(`    🚧 ${socialEvent.type} detected (${socialEvent.reason})`);
      const event = {
        city_id: city.city_id,
        zone_id: gridCell.zone_id,
        city_name: city.city_name,
        trigger_type: socialEvent.type,
        trigger_value: socialEvent.value,
        severity_factor: socialEvent.severity_factor,
        peak_multiplier: 1.0,
        event_id: null,
        data_source: 'SOCIAL',
      };
      await dispatchClaims(event);
      firedEvents.push(event);
    }
  }

  return firedEvents;
}

module.exports = {
  evaluateAllTriggers,
  dispatchClaims,
};
