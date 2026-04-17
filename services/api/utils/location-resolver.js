const axios = require('axios');
const {
  getCityForLatLon,
  latLonToGridCell,
  getNearestCity,
} = require('./geogrid');

const NOMINATIM_HEADERS = {
  'User-Agent': 'GigCare/1.0 (Phase 3 location resolver)',
  Accept: 'application/json',
};

function normalizeAddressParts(address = {}) {
  return {
    district: address.county || address.district || address.city_district || address.suburb || null,
    city: address.city || address.town || address.village || address.hamlet || null,
    state: address.state || address.region || null,
    country: address.country || null,
  };
}

async function reverseGeocodeLocation(lat, lon) {
  const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: {
      format: 'jsonv2',
      lat,
      lon,
      zoom: 18,
      addressdetails: 1,
    },
    headers: NOMINATIM_HEADERS,
    timeout: 8000,
  });

  return {
    display_name: response.data?.display_name || null,
    address: normalizeAddressParts(response.data?.address),
    raw: response.data,
  };
}

async function resolveUserLocation(lat, lon) {
  const supportedCity = getCityForLatLon(lat, lon);

  if (supportedCity) {
    const gridCell = latLonToGridCell(lat, lon, supportedCity);

    return {
      mode: 'SUPPORTED_CITY',
      city_id: supportedCity.city_id,
      city_name: supportedCity.city_name,
      state: supportedCity.state,
      climate_zone: supportedCity.climate_zone,
      cityConfig: supportedCity,
      gridCell,
      zone_id: gridCell.zone_id,
      centroid_lat: gridCell.centroid_lat,
      centroid_lon: gridCell.centroid_lon,
    };
  }

  const reverse = await reverseGeocodeLocation(lat, lon);
  const nearest = getNearestCity(lat, lon);

  return {
    mode: 'FALLBACK',
    district: reverse.address.district,
    city: reverse.address.city,
    state: reverse.address.state,
    country: reverse.address.country,
    display_name: reverse.display_name,
    nearest_city_id: nearest?.city.city_id || null,
    nearest_city_name: nearest?.city.city_name || null,
    nearest_city_distance_km: nearest ? Number(nearest.distance_km.toFixed(2)) : null,
    reverse_geocode_source: 'nominatim',
  };
}

module.exports = {
  resolveUserLocation,
  reverseGeocodeLocation,
  normalizeAddressParts,
};