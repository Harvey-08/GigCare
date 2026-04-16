const { CITY_CONFIGS } = require('../config/cities');

const DEG_PER_KM_LAT = 1 / 111.0;

function degPerKmLon(lat) {
  return 1 / (111.0 * Math.cos((lat * Math.PI) / 180));
}

function getCityForLatLon(lat, lon) {
  return CITY_CONFIGS.find((city) =>
    lat >= city.lat_min && lat <= city.lat_max && lon >= city.lon_min && lon <= city.lon_max
  ) || null;
}

function latLonToGridCell(lat, lon, cityConfig) {
  const gridConfig = cityConfig || getCityForLatLon(lat, lon);
  if (!gridConfig) {
    return null;
  }

  const lonDegreesPerKm = degPerKmLon((gridConfig.lat_min + gridConfig.lat_max) / 2);
  const row = Math.max(0, Math.floor((lat - gridConfig.lat_min) / DEG_PER_KM_LAT));
  const col = Math.max(0, Math.floor((lon - gridConfig.lon_min) / lonDegreesPerKm));

  return {
    city_id: gridConfig.city_id,
    city_name: gridConfig.city_name,
    climate_zone: gridConfig.climate_zone,
    row,
    col,
    zone_id: `${gridConfig.city_id}_${String(row).padStart(2, '0')}_${String(col).padStart(2, '0')}`,
    lat_min: gridConfig.lat_min + row * DEG_PER_KM_LAT,
    lat_max: gridConfig.lat_min + (row + 1) * DEG_PER_KM_LAT,
    lon_min: gridConfig.lon_min + col * lonDegreesPerKm,
    lon_max: gridConfig.lon_min + (col + 1) * lonDegreesPerKm,
    centroid_lat: gridConfig.lat_min + (row + 0.5) * DEG_PER_KM_LAT,
    centroid_lon: gridConfig.lon_min + (col + 0.5) * lonDegreesPerKm,
  };
}

function getAllGridCells(cityConfig) {
  const lonDegreesPerKm = degPerKmLon((cityConfig.lat_min + cityConfig.lat_max) / 2);
  const rows = Math.ceil((cityConfig.lat_max - cityConfig.lat_min) / DEG_PER_KM_LAT);
  const cols = Math.ceil((cityConfig.lon_max - cityConfig.lon_min) / lonDegreesPerKm);
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        city_id: cityConfig.city_id,
        city_name: cityConfig.city_name,
        climate_zone: cityConfig.climate_zone,
        row,
        col,
        zone_id: `${cityConfig.city_id}_${String(row).padStart(2, '0')}_${String(col).padStart(2, '0')}`,
        centroid_lat: cityConfig.lat_min + (row + 0.5) * DEG_PER_KM_LAT,
        centroid_lon: cityConfig.lon_min + (col + 0.5) * lonDegreesPerKm,
      });
    }
  }

  return cells;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

function getNearestCity(lat, lon) {
  let nearestCity = null;
  let nearestDistanceKm = Infinity;

  for (const city of CITY_CONFIGS) {
    const distanceKm = haversineKm(lat, lon, city.centroid_lat, city.centroid_lon);
    if (distanceKm < nearestDistanceKm) {
      nearestCity = city;
      nearestDistanceKm = distanceKm;
    }
  }

  return nearestCity ? { city: nearestCity, distance_km: nearestDistanceKm } : null;
}

module.exports = {
  CITY_CONFIGS,
  DEG_PER_KM_LAT,
  degPerKmLon,
  getCityForLatLon,
  latLonToGridCell,
  getAllGridCells,
  haversineKm,
  getNearestCity,
};