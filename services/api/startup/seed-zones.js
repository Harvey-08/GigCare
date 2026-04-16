const supabase = require('../models/supabase');
const { CITY_CONFIGS } = require('../config/cities');
const { getAllGridCells } = require('../utils/geogrid');

async function seedAllCityZones() {
  let totalUpserted = 0;

  for (const cityConfig of CITY_CONFIGS) {
    const cells = getAllGridCells(cityConfig);
    const chunkSize = 500;

    for (let index = 0; index < cells.length; index += chunkSize) {
      const chunk = cells.slice(index, index + chunkSize).map((cell) => ({
        zone_id: cell.zone_id,
        name: `${cityConfig.city_name} Grid ${cell.row}-${cell.col}`,
        city: cityConfig.city_name,
        city_id: cityConfig.city_id,
        grid_row: cell.row,
        grid_col: cell.col,
        centroid_lat: cell.centroid_lat,
        centroid_lon: cell.centroid_lon,
        climate_zone: cityConfig.climate_zone,
        lat: cell.centroid_lat,
        lon: cell.centroid_lon,
        zone_risk_score: 1.0,
        zone_risk_level: 'MEDIUM',
        flood_prone: false,
      }));

      const { error } = await supabase
        .from('zones')
        .upsert(chunk, { onConflict: 'zone_id' });

      if (error) {
        throw error;
      }

      totalUpserted += chunk.length;
    }

    console.log(`[seed-zones] Seeded ${cells.length} cells for ${cityConfig.city_name}`);
  }

  console.log(`[seed-zones] Completed zone seeding. Total cells processed: ${totalUpserted}`);
  return totalUpserted;
}

if (require.main === module) {
  seedAllCityZones()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('[seed-zones] Failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAllCityZones };