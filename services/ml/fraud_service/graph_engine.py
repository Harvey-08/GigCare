from collections import defaultdict

import networkx as nx


class FraudGraphEngine:
    def __init__(self):
        self.G = nx.Graph()
        self.node_types = {}
        self.worker_cities = {}

    def add_claim_signals(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id=None):
        self.G.add_node(worker_id)
        self.node_types[worker_id] = 'worker'
        if city_id:
            self.worker_cities[worker_id] = city_id

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

            for node in component:
                if self.node_types.get(node) in ('device', 'ip', 'wifi'):
                    connected_workers = [neighbor for neighbor in self.G.neighbors(node) if self.node_types.get(neighbor) == 'worker']
                    if len(connected_workers) > 1:
                        shared_signals[self.node_types[node]].append(node)

            rings.append(
                {
                    'worker_ids': workers,
                    'ring_size': len(workers),
                    'cities_involved': sorted(cities),
                    'is_cross_city': len(cities) > 1,
                    'shared_signals': dict(shared_signals),
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