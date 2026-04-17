from flask import Flask, jsonify, request

from graph_engine import fraud_graph
from nlp_trust_enhancer import nlp_enhancer
from trust_calculator import calculate_trust_score

app = Flask(__name__)


@app.route('/score-claim', methods=['POST'])
def score_claim():
    payload = request.get_json(force=True, silent=True) or {}
    features = payload.get('features', payload)
    worker_history = payload.get('worker_history', {})
    claim_notes = payload.get('claim_notes', '')

    result = calculate_trust_score(
        features=features,
        worker_id=payload.get('worker_id', 'unknown-worker'),
        device_fp=payload.get('device_fingerprint', payload.get('device_fp', 'unknown-device')),
        ip=payload.get('ip_address', payload.get('ip', 'UNKNOWN')),
        wifi_ssids=payload.get('wifi_ssids', []),
        claim_city_id=payload.get('claim_city_id'),
        worker_registered_city_id=payload.get('worker_registered_city_id'),
    )

    # Apply NLP trust enhancement if enabled
    if payload.get('enable_nlp_enhancement'):
        linguistic_features = nlp_enhancer.extract_linguistic_features(claim_notes)
        behavior_patterns = nlp_enhancer.analyze_behavior_patterns(worker_history)

        enhanced = nlp_enhancer.enhance_claim_decision(result['action'], linguistic_features, behavior_patterns)

        result['original_action'] = result['action']
        result['action'] = enhanced['enhanced_decision']
        result['nlp_enhancement'] = {
            'adjustment_factor': enhanced['nlp_features'],
        }

    return jsonify(result)


@app.route('/rings', methods=['GET'])
def rings():
    fraud_graph.sync_from_store()
    return jsonify({'data': fraud_graph.detect_rings(), 'meta': {'count': len(fraud_graph.detect_rings())}})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '3.0'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False)
