import pickle

import numpy as np

from graph_engine import fraud_graph
from rules_engine import check_hard_blocks

try:
    with open('fraud_models.pkl', 'rb') as handle:
        artifact = pickle.load(handle)
except FileNotFoundError:
    artifact = {
        'xgb_model': None,
        'iso_forest': None,
        'features': [],
        'shap_explainer': None,
        'shap_available': False,
        'auc': None,
        'false_positive_rate': None,
    }

xgb_model = artifact['xgb_model']
iso_forest = artifact['iso_forest']
explainer = artifact['shap_explainer']
FEATURES = artifact['features']


def generate_explanation(features, row, fraud_prob):
    if explainer is None:
        reasons = []
        if features.get('gps_cell_offset_km', 0) > 0.5:
            reasons.append(f"GPS-cell mismatch {features['gps_cell_offset_km']:.1f}km")
        if features.get('implied_max_speed_kmh', 0) > 60:
            reasons.append(f"Implied speed {features['implied_max_speed_kmh']:.0f}km/h")
        if features.get('claim_cluster_10min', 0) > 5:
            reasons.append(f"{features['claim_cluster_10min']} clustered claims")
        if features.get('cross_city_claim', 0) == 1:
            reasons.append('Cross-city claim')
        return ' | '.join(reasons) if reasons else 'No specific anomaly detected'

    try:
        import shap

        shap_values = explainer.shap_values(row)[0]
        top_features = sorted(zip(FEATURES, shap_values), key=lambda item: abs(item[1]), reverse=True)[:3]
        total = sum(abs(value) for _, value in top_features) or 1
        parts = [f'{feature}: {abs(value) / total * 100:.0f}%' for feature, value in top_features]
        return f'Fraud score {fraud_prob:.2f}: ' + ' | '.join(parts)
    except Exception:
        return f'Fraud probability: {fraud_prob:.2f}'


def calculate_trust_score(features, worker_id, device_fp, ip, wifi_ssids, claim_city_id=None, worker_registered_city_id=None):
    features = dict(features or {})
    if claim_city_id and worker_registered_city_id and claim_city_id != worker_registered_city_id:
        features['cross_city_claim'] = 1
    else:
        features.setdefault('cross_city_claim', 0)

    block_result = check_hard_blocks(features)
    if block_result['blocked']:
        return {
            'trust_score': 0.0,
            'action': 'DENIED',
            'explanation': block_result['reason'],
            'fraud_probability': 1.0,
        }

    fraud_graph.add_claim_signals(worker_id, device_fp, ip, wifi_ssids, city_id=claim_city_id)

    if fraud_graph.is_worker_in_ring(worker_id):
        return {
            'trust_score': 0.0,
            'action': 'DENIED',
            'explanation': 'Account is part of a detected fraud ring',
            'fraud_probability': 1.0,
        }

    row = np.array([[features.get(feature, 0) for feature in FEATURES]]) if FEATURES else np.zeros((1, 1))

    if xgb_model is None:
        fraud_prob = 0.5
    else:
        fraud_prob = float(xgb_model.predict_proba(row)[0][1])

    base_trust = 1.0 - fraud_prob

    if iso_forest is not None:
        is_anomalous = iso_forest.predict(row)[0] == -1
        if is_anomalous and 0.35 < base_trust < 0.70:
            base_trust = min(base_trust, 0.55)

    explanation = generate_explanation(features, row, fraud_prob)
    final_trust = max(0.0, min(1.0, base_trust))

    if final_trust > 0.85:
        action = 'APPROVED'
    elif final_trust >= 0.60:
        action = 'PARTIAL'
    else:
        action = 'FLAGGED'

    return {
        'trust_score': round(final_trust, 3),
        'action': action,
        'explanation': explanation,
        'fraud_probability': round(fraud_prob, 3),
    }