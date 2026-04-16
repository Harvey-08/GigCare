const DEG_PER_KM_LAT = 1 / 111.0;

function degPerKmLon(lat) {
  return 1 / (111.0 * Math.cos((lat * Math.PI) / 180));
}

function latLonToGridCell(lat, lon, cityConfig) {
  if (!cityConfig) {
    return null;
  }

  const lonDegreesPerKm = degPerKmLon((cityConfig.lat_min + cityConfig.lat_max) / 2);
  const row = Math.max(0, Math.floor((lat - cityConfig.lat_min) / DEG_PER_KM_LAT));
  const col = Math.max(0, Math.floor((lon - cityConfig.lon_min) / lonDegreesPerKm));

  return {
    city_id: cityConfig.city_id,
    row,
    col,
    zone_id: `${cityConfig.city_id}_${String(row).padStart(2, '0')}_${String(col).padStart(2, '0')}`,
    centroid_lat: cityConfig.lat_min + (row + 0.5) * DEG_PER_KM_LAT,
    centroid_lon: cityConfig.lon_min + (col + 0.5) * lonDegreesPerKm,
  };
}

module.exports = {
  latLonToGridCell,
};
