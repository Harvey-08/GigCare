# services/ml/premium_service/app.py
# Flask server for premium pricing inference - Person C

from flask import Flask, request, jsonify
import pickle
import numpy as np
import os

app = Flask(__name__)

# Load model
model = None
FEATURES = None

def load_model():
    global model, FEATURES
    if os.path.exists('premium_model.pkl'):
        with open('premium_model.pkl', 'rb') as f:
            saved = pickle.load(f)
            model = saved['model']
            FEATURES = saved['features']
        print("✅ Premium model loaded")
    else:
        print("⚠️  Model not found, please run train.py first")

load_model()

# =====================================================
# POST /predict-premium
# Predict weekly premium for a worker
# =====================================================
@app.route('/predict-premium', methods=['POST'])
def predict_premium():
    try:
        data = request.json
        
        # Extract features
        row = np.array([[data.get(f, 0) for f in FEATURES]])
        
        # Predict
        premium = float(model.predict(row)[0])
        premium = max(60, min(280, premium))  # Clamp to valid range
        
        # Get feature importances
        importances = dict(zip(FEATURES, model.feature_importances_))
        
        return jsonify({
            'premium_rupees': round(premium),
            'feature_importances': importances,
            'model': 'RandomForestRegressor',
            'n_estimators': 200,
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# =====================================================
# POST /retrain
# Retrain model with new data (Phase 3)
# =====================================================
@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        # Placeholder for Phase 3
        return jsonify({
            'status': 'retrain_requested',
            'note': 'Full retraining logic comes in Phase 3'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# GET /health
# Health check
# =====================================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

if __name__ == '__main__':
    print("🚀 Premium Service starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
