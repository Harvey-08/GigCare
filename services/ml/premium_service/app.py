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


def build_feature_row(payload, forecast):
    now = datetime.now()
    city_id = payload.get('city_id', 'BLR')
    zone_risk_score = float(payload.get('zone_risk_score', 1.0))
    flood_prone = int(bool(payload.get('flood_prone', False)))

    return np.array([[
        forecast['rain_mm_7day'],
        forecast['max_temp_c'],
        forecast['min_temp_c'],
        forecast['rain_days_count'],
        forecast['heavy_rain_days'],
        forecast['heat_days'],
        zone_risk_score,
        flood_prone,
        now.month,
        1 if now.month in [6, 7, 8, 9] else 0,
        1 if now.month in [3, 4, 5] else 0,
    ]]), city_id


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
        feature_row, city_id = build_feature_row(payload, forecast)

        if model is not None and FEATURES:
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
