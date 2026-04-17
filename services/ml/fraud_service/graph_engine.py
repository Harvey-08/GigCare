from collections import defaultdict
from collections import Counter
from datetime import datetime

import networkx as nx


class FraudGraphEngine:
    def __init__(self):
        self.G = nx.Graph()
        self.node_types = {}
        self.worker_cities = {}
        self.worker_metadata = {}

    def add_claim_signals(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id=None):
        self.G.add_node(worker_id)
        self.node_types[worker_id] = 'worker'
        if city_id:
            self.worker_cities[worker_id] = city_id

        self.worker_metadata[worker_id] = {
            'worker_id': worker_id,
            'city_id': city_id,
            'device_fingerprint': device_fingerprint,
            'ip_address': ip_address,
            'wifi_ssids': list(wifi_ssids or []),
            'last_seen_at': datetime.utcnow().isoformat() + 'Z',
        }

        if device_fingerprint:
            self.G.add_node(device_fingerprint)
            self.node_types[device_fingerprint] = 'device'
            self.G.add_edge(worker_id, device_fingerprint, signal='device')

        if ip_address and ip_address not in ('127.0.0.1', '::1', ''):
            self.G.add_node(ip_address)
            self.node_types[ip_address] = 'ip'
            self.G.add_edge(worker_id, ip_address, signal='ip')

        for ssid in wifi_ssids or []:
            self.G.add_node(ssid)
            self.node_types[ssid] = 'wifi'
            self.G.add_edge(worker_id, ssid, signal='wifi')

    def detect_rings(self, min_workers=10):
        rings = []
        for component in nx.connected_components(self.G):
            workers = [node for node in component if self.node_types.get(node) == 'worker']
            if len(workers) < min_workers:
                continue

            cities = {self.worker_cities.get(worker, 'UNKNOWN') for worker in workers}
            shared_signals = defaultdict(list)
            worker_details = [self.worker_metadata.get(worker, {'worker_id': worker}) for worker in workers]

            for node in component:
                if self.node_types.get(node) in ('device', 'ip', 'wifi'):
                    connected_workers = [neighbor for neighbor in self.G.neighbors(node) if self.node_types.get(neighbor) == 'worker']
                    if len(connected_workers) > 1:
                        shared_signals[self.node_types[node]].append(node)

            shared_signal_counts = {signal_type: len(values) for signal_type, values in shared_signals.items()}
            dominant_city = Counter(worker.get('city_id') or 'UNKNOWN' for worker in worker_details).most_common(1)
            dominant_city_id = dominant_city[0][0] if dominant_city else 'UNKNOWN'
            suspicious_indicators = []

            if shared_signal_counts.get('device'):
                suspicious_indicators.append(f"{shared_signal_counts['device']} shared device fingerprints")
            if shared_signal_counts.get('ip'):
                suspicious_indicators.append(f"{shared_signal_counts['ip']} shared IP addresses")
            if shared_signal_counts.get('wifi'):
                suspicious_indicators.append(f"{shared_signal_counts['wifi']} shared Wi-Fi SSIDs")
            if len(cities) > 1:
                suspicious_indicators.append('cross-city cluster')

            if not suspicious_indicators:
                suspicious_indicators.append('high claim-network density')

            rings.append(
                {
                    'worker_ids': workers,
                    'worker_details': worker_details,
                    'ring_size': len(workers),
                    'cities_involved': sorted(cities),
                    'dominant_city_id': dominant_city_id,
                    'possible_locations': sorted(cities),
                    'is_cross_city': len(cities) > 1,
                    'shared_signals': dict(shared_signals),
                    'shared_signal_counts': shared_signal_counts,
                    'suspicious_indicators': suspicious_indicators,
                    'summary': f"{len(workers)} workers linked by {', '.join(suspicious_indicators)}",
                }
            )

        return rings

    def is_worker_in_ring(self, worker_id, min_workers=10):
        if worker_id not in self.G:
            return False

        component = nx.node_connected_component(self.G, worker_id)
        workers = [node for node in component if self.node_types.get(node) == 'worker']
        return len(workers) >= min_workers

    def temporal_spike_check(self, zone_id, recent_claims_10min):
        return len(recent_claims_10min) > 50


fraud_graph = FraudGraphEngine()