from datetime import datetime
import os
import pickle
import subprocess

import numpy as np
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

MODEL_PATH = 'premium_model.pkl'

model = None
FEATURES = []
MODEL_META = {}


def load_model():
    global model, FEATURES, MODEL_META
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as handle:
            saved = pickle.load(handle)
            model = saved['model']
            FEATURES = saved['features']
            MODEL_META = {
                'mae': saved.get('mae'),
                'r2': saved.get('r2'),
                'cv_r2': saved.get('cv_r2'),
                'trained_at': saved.get('trained_at'),
                'trained_on_rows': saved.get('trained_on_rows'),
            }
        print('✅ Premium model loaded')
    else:
        print('⚠️  Model not found, please run train.py first')


def fetch_forecast_features(lat, lon):
    try:
        response = requests.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': lat,
                'longitude': lon,
                'daily': 'precipitation_sum,temperature_2m_max,temperature_2m_min',
                'forecast_days': 7,
                'timezone': 'Asia/Kolkata',
            },
            timeout=6,
        )
        response.raise_for_status()
        payload = response.json()

        precip = payload.get('daily', {}).get('precipitation_sum', [])
        max_temp = payload.get('daily', {}).get('temperature_2m_max', [])
        min_temp = payload.get('daily', {}).get('temperature_2m_min', [])

        return {
            'rain_mm_7day': float(sum(float(value or 0) for value in precip)),
            'max_temp_c': float(max((value for value in max_temp if value is not None), default=32)),
            'min_temp_c': float(min((value for value in min_temp if value is not None), default=22)),
            'rain_days_count': int(sum(1 for value in precip if value is not None and value >= 10)),
            'heavy_rain_days': int(sum(1 for value in precip if value is not None and value >= 50)),
            'heat_days': int(sum(1 for value in max_temp if value is not None and value >= 40)),
        }
    except Exception as error:
        print(f'Forecast fetch failed: {error}')
        return {
            'rain_mm_7day': 0.0,
            'max_temp_c': 32.0,
            'min_temp_c': 22.0,
            'rain_days_count': 0,
            'heavy_rain_days': 0,
            'heat_days': 0,
        }


def build_feature_map(payload, forecast):
    now = datetime.now()
    city_id = payload.get('city_id', 'BLR')
    zone_risk_score = float(payload.get('zone_risk_score', 1.0))
    rain_days_count = int(forecast.get('rain_days_count', 0))
    heavy_rain_days = int(forecast.get('heavy_rain_days', 0))
    heat_days = int(forecast.get('heat_days', 0))
    past_claim_count = int(payload.get('past_claim_count', 0) or 0)

    # Provide a superset feature map so old (9-feature) and new (11-feature)
    # models can both infer without shape mismatches.
    features = {
        # Newer weather-rich feature set
        'rain_mm_7day': float(forecast.get('rain_mm_7day', 0.0)),
        'max_temp_c': float(forecast.get('max_temp_c', 32.0)),
        'min_temp_c': float(forecast.get('min_temp_c', 22.0)),
        'rain_days_count': rain_days_count,
        'heavy_rain_days': heavy_rain_days,
        'heat_days': heat_days,
        'zone_risk_score': zone_risk_score,
        'flood_prone': int(bool(payload.get('flood_prone', False))),
        'month': now.month,
        'is_monsoon': 1 if now.month in [6, 7, 8, 9] else 0,
        'is_summer': 1 if now.month in [3, 4, 5] else 0,
        # Legacy 9-feature model compatibility
        'historical_rain_events': rain_days_count,
        'historical_heat_events': heat_days,
        'forecast_rain_prob': min(1.0, max(0.0, heavy_rain_days / 7.0)),
        'forecast_max_temp_c': float(forecast.get('max_temp_c', 32.0)),
        'worker_experience_weeks': float(payload.get('worker_experience_weeks', 0) or 0),
        'past_claim_count': past_claim_count,
        'past_fraud_flags': float(payload.get('past_fraud_flags', 0) or 0),
        'past_claim_ratio': float(payload.get('past_claim_ratio', min(1.0, past_claim_count / 10.0)) or 0),
    }

    return features, city_id


def fallback_premium(forecast, zone_risk_score, city_id):
    month = datetime.now().month
    seasonal_multiplier = {
        1: 0.85,
        2: 0.85,
        3: 0.95,
        4: 1.10,
        5: 1.20,
        6: 1.45,
        7: 1.50,
        8: 1.50,
        9: 1.35,
        10: 1.05,
        11: 0.90,
        12: 0.85,
    }.get(month, 1.0)

    city_anchor = {
        'BLR': 145,
        'MUM': 200,
        'DEL': 155,
        'CHN': 170,
        'HYD': 132,
        'PUN': 120,
        'KOL': 175,
        'AMD': 110,
        'JAI': 84,
        'KOC': 212,
    }.get(city_id, 140)

    premium = city_anchor + (forecast['rain_mm_7day'] * 0.15) + (forecast['heat_days'] * 3.0) + (zone_risk_score * 12)
    return round(max(80, min(250, premium * seasonal_multiplier)))


load_model()


@app.route('/predict-premium', methods=['POST'])
def predict_premium():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        lat = float(payload.get('centroid_lat'))
        lon = float(payload.get('centroid_lon'))

        forecast = fetch_forecast_features(lat, lon)
        feature_map, city_id = build_feature_map(payload, forecast)

        if model is not None and FEATURES:
            feature_row = np.array([[feature_map.get(feature, 0.0) for feature in FEATURES]])
            premium = float(model.predict(feature_row)[0])
            premium = max(80, min(250, premium))
        else:
            premium = float(fallback_premium(forecast, float(payload.get('zone_risk_score', 1.0)), city_id))

        return jsonify({
            'premium_rupees': round(premium),
            'forecast_used': forecast,
            'city_id': city_id,
            'model_loaded': model is not None,
            'model_metrics': MODEL_META,
            'trained_features': FEATURES,
        })
    except Exception as error:
        print(f'Error: {error}')
        return jsonify({'error': str(error)}), 500


@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        subprocess.Popen([os.environ.get('PYTHON_EXECUTABLE', 'python'), 'train.py'])
        return jsonify({'status': 'retraining_started'})
    except Exception as error:
        return jsonify({'error': str(error)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None, 'features': FEATURES, 'metrics': MODEL_META})


if __name__ == '__main__':
    print('🚀 Premium Service starting on port 5001...')
    app.run(host='0.0.0.0', port=5001, debug=False)
