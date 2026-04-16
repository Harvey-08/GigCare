import os
import time
from datetime import datetime, timedelta

import psycopg2
import requests

DB_URL = os.environ['DATABASE_URL']

TRAINING_POINTS = [
    ('BLR', 12.9716, 77.5946, 'tropical_savanna'),
    ('BLR', 12.9352, 77.6245, 'tropical_savanna'),
    ('MUM', 19.0760, 72.8777, 'tropical_coastal'),
    ('MUM', 19.1764, 72.9897, 'tropical_coastal'),
    ('DEL', 28.6139, 77.2090, 'humid_subtropical'),
    ('DEL', 28.5355, 77.3910, 'humid_subtropical'),
    ('CHN', 13.0827, 80.2707, 'tropical_coastal'),
    ('HYD', 17.3850, 78.4867, 'semi_arid_tropical'),
    ('PUN', 18.5204, 73.8567, 'tropical_savanna'),
    ('KOL', 22.5726, 88.3639, 'humid_subtropical'),
    ('AMD', 23.0225, 72.5714, 'semi_arid'),
    ('JAI', 26.9124, 75.7873, 'arid'),
    ('KOC', 9.9312, 76.2673, 'tropical_rainforest'),
    ('KOC', 9.8500, 76.3200, 'tropical_rainforest'),
]

CLIMATE_BASE_RATES = {
    'tropical_rainforest': 160,
    'tropical_coastal': 130,
    'tropical_savanna': 100,
    'humid_subtropical': 115,
    'semi_arid_tropical': 95,
    'semi_arid': 85,
    'arid': 70,
}


def ensure_table(cursor):
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS ml_training_data (
            id SERIAL PRIMARY KEY,
            city_id VARCHAR(5) NOT NULL,
            climate_zone VARCHAR(30) NOT NULL,
            centroid_lat FLOAT NOT NULL,
            centroid_lon FLOAT NOT NULL,
            week_start DATE NOT NULL,
            rain_mm_7day FLOAT,
            max_temp_c FLOAT,
            min_temp_c FLOAT,
            rain_days_count INTEGER,
            heavy_rain_days INTEGER,
            heat_days INTEGER,
            zone_risk_score FLOAT,
            flood_prone BOOLEAN DEFAULT FALSE,
            month INTEGER,
            is_monsoon INTEGER DEFAULT 0,
            is_summer INTEGER DEFAULT 0,
            optimal_premium_rupees FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(city_id, centroid_lat, centroid_lon, week_start)
        )
        '''
    )
    cursor.connection.commit()


def fetch_weather_week(lat, lon, start_date, end_date):
    response = requests.get(
        'https://archive-api.open-meteo.com/v1/archive',
        params={
            'latitude': lat,
            'longitude': lon,
            'start_date': start_date,
            'end_date': end_date,
            'daily': 'precipitation_sum,temperature_2m_max,temperature_2m_min',
            'timezone': 'Asia/Kolkata',
        },
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()

    precip = payload.get('daily', {}).get('precipitation_sum', [])
    max_temp = payload.get('daily', {}).get('temperature_2m_max', [])
    min_temp = payload.get('daily', {}).get('temperature_2m_min', [])

    return {
        'rain_mm_7day': float(sum(float(value or 0) for value in precip)),
        'max_temp_c': float(max((value for value in max_temp if value is not None), default=30)),
        'min_temp_c': float(min((value for value in min_temp if value is not None), default=20)),
        'rain_days_count': int(sum(1 for value in precip if value is not None and value >= 10)),
        'heavy_rain_days': int(sum(1 for value in precip if value is not None and value >= 50)),
        'heat_days': int(sum(1 for value in max_temp if value is not None and value >= 40)),
    }


def build_label(climate_zone, weather, month):
    base_rate = CLIMATE_BASE_RATES[climate_zone]
    monsoon_multiplier = 1.18 if month in (6, 7, 8, 9) else 1.0
    seasonal_bonus = 1.12 if climate_zone in ('tropical_rainforest', 'tropical_coastal') and month in (10, 11, 12) else 1.0
    premium = (base_rate * monsoon_multiplier * seasonal_bonus) + (weather['rain_mm_7day'] * 0.08) + (weather['heavy_rain_days'] * 4.0) + (weather['heat_days'] * 3.0)
    return float(max(60, min(280, premium)))


def main():
    print('🚀 Building premium training dataset from real weather data...')
    connection = psycopg2.connect(DB_URL)
    cursor = connection.cursor()
    ensure_table(cursor)

    inserted_rows = 0
    now = datetime.now()

    for city_id, lat, lon, climate_zone in TRAINING_POINTS:
        for weeks_back in range(1, 53):
            week_start = (now - timedelta(weeks=weeks_back)).date().isoformat()
            week_end = (now - timedelta(weeks=weeks_back - 1)).date().isoformat()
            month = int(week_start[5:7])
            is_monsoon = 1 if month in (6, 7, 8, 9, 10, 11) else 0
            is_summer = 1 if month in (3, 4, 5) else 0

            try:
                weather = fetch_weather_week(lat, lon, week_start, week_end)
                zone_risk_score = float(
                    max(
                        0.5,
                        min(
                            3.0,
                            0.9
                            + (weather['rain_mm_7day'] / 140.0)
                            + (weather['heavy_rain_days'] * 0.08)
                            + (weather['heat_days'] * 0.05),
                        ),
                    )
                )
                optimal_premium = build_label(climate_zone, weather, month)

                cursor.execute(
                    '''
                    INSERT INTO ml_training_data (
                        city_id,
                        climate_zone,
                        centroid_lat,
                        centroid_lon,
                        week_start,
                        rain_mm_7day,
                        max_temp_c,
                        min_temp_c,
                        rain_days_count,
                        heavy_rain_days,
                        heat_days,
                        zone_risk_score,
                        flood_prone,
                        month,
                        is_monsoon,
                        is_summer,
                        optimal_premium_rupees
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (city_id, centroid_lat, centroid_lon, week_start) DO NOTHING
                    ''',
                    (
                        city_id,
                        climate_zone,
                        lat,
                        lon,
                        week_start,
                        weather['rain_mm_7day'],
                        weather['max_temp_c'],
                        weather['min_temp_c'],
                        weather['rain_days_count'],
                        weather['heavy_rain_days'],
                        weather['heat_days'],
                        zone_risk_score,
                        climate_zone in ('tropical_rainforest', 'tropical_coastal'),
                        month,
                        is_monsoon,
                        is_summer,
                        optimal_premium,
                    ),
                )
                connection.commit()
                inserted_rows += 1
            except Exception as error:
                print(f'  ⚠️  {city_id} {week_start} skipped: {error}')

            time.sleep(0.12)

    cursor.close()
    connection.close()
    print(f'✅ Dataset build complete. Rows processed: {inserted_rows}')


if __name__ == '__main__':
    main()