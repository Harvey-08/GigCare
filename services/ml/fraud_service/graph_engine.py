import json
import os
from collections import defaultdict
from collections import Counter
from datetime import datetime
from pathlib import Path

import networkx as nx


DEFAULT_STORE_PATH = os.getenv('FRAUD_RING_STORE_PATH', 'fraud_ring_store.json')


class FraudGraphEngine:
    def __init__(self):
        self.G = nx.Graph()
        self.node_types = {}
        self.worker_cities = {}
        self.worker_metadata = {}
        self.store_path = Path(DEFAULT_STORE_PATH)
        self._record_keys = set()
        self._load_persisted_records()

    def _record_key(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id):
        wifi_key = '|'.join(sorted(str(ssid).strip() for ssid in (wifi_ssids or []) if str(ssid).strip()))
        return '::'.join([
            str(worker_id or '').strip(),
            str(device_fingerprint or '').strip(),
            str(ip_address or '').strip(),
            wifi_key,
            str(city_id or '').strip(),
        ])

    def _read_store(self):
        if not self.store_path.exists():
            return []

        try:
            with self.store_path.open('r', encoding='utf-8') as handle:
                payload = json.load(handle)
        except Exception:
            return []

        if isinstance(payload, dict):
            records = payload.get('records', [])
        else:
            records = payload

        return records if isinstance(records, list) else []

    def _write_store(self, records):
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.store_path.with_suffix('.tmp')
        with temp_path.open('w', encoding='utf-8') as handle:
            json.dump({'records': records}, handle, ensure_ascii=True, indent=2)
        temp_path.replace(self.store_path)

    def _load_persisted_records(self):
        for record in self._read_store():
            if not isinstance(record, dict):
                continue

            worker_id = record.get('worker_id')
            device_fingerprint = record.get('device_fingerprint')
            ip_address = record.get('ip_address')
            wifi_ssids = record.get('wifi_ssids', [])
            city_id = record.get('city_id')

            key = self._record_key(worker_id, device_fingerprint, ip_address, wifi_ssids, city_id)
            if key in self._record_keys:
                continue

            self._record_keys.add(key)
            self._apply_signal_record(
                worker_id=worker_id,
                device_fingerprint=device_fingerprint,
                ip_address=ip_address,
                wifi_ssids=wifi_ssids,
                city_id=city_id,
                last_seen_at=record.get('last_seen_at'),
            )

    def _persist_signal_record(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id):
        key = self._record_key(worker_id, device_fingerprint, ip_address, wifi_ssids, city_id)
        if key in self._record_keys:
            return

        records = self._read_store()
        records.append(
            {
                'worker_id': worker_id,
                'device_fingerprint': device_fingerprint,
                'ip_address': ip_address,
                'wifi_ssids': list(wifi_ssids or []),
                'city_id': city_id,
                'last_seen_at': datetime.utcnow().isoformat() + 'Z',
            }
        )
        self._write_store(records)
        self._record_keys.add(key)

    def _apply_signal_record(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id=None, last_seen_at=None):
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
            'last_seen_at': last_seen_at or (datetime.utcnow().isoformat() + 'Z'),
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

    def add_claim_signals(self, worker_id, device_fingerprint, ip_address, wifi_ssids, city_id=None, persist=True):
        self._apply_signal_record(
            worker_id=worker_id,
            device_fingerprint=device_fingerprint,
            ip_address=ip_address,
            wifi_ssids=wifi_ssids,
            city_id=city_id,
        )

        if persist:
            self._persist_signal_record(worker_id, device_fingerprint, ip_address, wifi_ssids, city_id)

    def sync_from_store(self):
        self.G.clear()
        self.node_types.clear()
        self.worker_cities.clear()
        self.worker_metadata.clear()
        self._record_keys.clear()
        self._load_persisted_records()

    def detect_rings(self, min_workers=None):
        if min_workers is None:
            min_workers = int(os.getenv('FRAUD_RING_MIN_WORKERS', '6'))
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

    def is_worker_in_ring(self, worker_id, min_workers=None):
        if min_workers is None:
            min_workers = int(os.getenv('FRAUD_RING_BLOCK_THRESHOLD', '8'))
        if worker_id not in self.G:
            return False

        component = nx.node_connected_component(self.G, worker_id)
        workers = [node for node in component if self.node_types.get(node) == 'worker']
        return len(workers) >= min_workers

    def temporal_spike_check(self, zone_id, recent_claims_10min):
        return len(recent_claims_10min) > 50


fraud_graph = FraudGraphEngine()