import math


def haversine_km(lat1, lon1, lat2, lon2):
    radius_km = 6371
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(delta_lon / 2) ** 2
    )
    return radius_km * 2 * math.asin(math.sqrt(a))


def check_hard_blocks(features):
    if features.get('implied_max_speed_kmh', 0) > 150:
        return {
            'blocked': True,
            'reason': f"Teleport detected: implied speed {features['implied_max_speed_kmh']}km/h",
            'action': 'DENY',
        }

    if features.get('gps_speed_kmh', 0) > 10 and features.get('accelerometer_mag', 99) < 0.3:
        return {
            'blocked': True,
            'reason': 'Sensor mismatch: GPS moving but device stationary',
            'action': 'DENY',
        }

    if features.get('gps_zone_offset_km', 0) > 2.0:
        return {
            'blocked': True,
            'reason': f"GPS outside claimed zone by {round(features['gps_zone_offset_km'], 1)}km",
            'action': 'DENY',
        }

    if features.get('ip_country_code', 'IN') not in ['IN', 'UNKNOWN']:
        return {
            'blocked': True,
            'reason': 'IP geolocation outside India',
            'action': 'DENY',
        }

    if features.get('shared_device_count', 1) >= 5:
        return {
            'blocked': True,
            'reason': f"Device fingerprint linked to {features['shared_device_count']} accounts",
            'action': 'DENY',
        }

    if features.get('payload_age_seconds', 0) > 300:
        return {
            'blocked': True,
            'reason': f"Stale payload: {features['payload_age_seconds']} seconds old",
            'action': 'DENY',
        }

    if features.get('rooted_device', False) and features.get('gps_cell_offset_km', 0) > 1.0:
        return {
            'blocked': True,
            'reason': 'Rooted device with GPS-cell mismatch',
            'action': 'DENY',
        }

    if features.get('seconds_since_trigger', 999) < 30:
        return {
            'blocked': True,
            'reason': 'Claim submitted too fast after trigger',
            'action': 'FLAG',
        }

    if features.get('cross_city_claim', 0) == 1:
        return {
            'blocked': True,
            'reason': 'Claim submitted from a different city than the worker profile',
            'action': 'FLAG',
        }

    return {'blocked': False, 'reason': None, 'action': 'PASS'}