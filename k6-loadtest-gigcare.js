// k6-loadtest-gigcare.js
// k6 Load Testing Suite for GigCare Phase 3
// Tests API, Fraud Service, Premium Service under high load
// Run: k6 run k6-loadtest-gigcare.js

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const fraudValidationTime = new Rate('fraud_response_time');

// Test configuration
export const options = {
  vus: 100, // Virtual users
  duration: '10m', // 10 minute test

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% <= 500ms, 99% <= 1000ms
    http_req_failed: ['rate<0.1'], // Error rate < 10%
    errors: ['rate<0.05'], // Custom error rate < 5%
  },

  stages: [
    { duration: '1m', target: 20 }, // Ramp up to 20 VUs
    { duration: '3m', target: 100 }, // Ramp up to 100 VUs
    { duration: '4m', target: 100 }, // Stay at 100 VUs
    { duration: '2m', target: 0 }, // Ramp down to 0 VUs
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3011';
const ML_BASE_URL = __ENV.ML_BASE_URL || 'http://localhost:5002';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'gigcare@admin.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin123@';

let adminToken = '';

export function setup() {
  // Get admin token for authenticated requests
  const loginRes = http.post(`${BASE_URL}/api/admin/login`, JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    adminToken = data.token || '';
  }

  return { adminToken };
}

export default function (data) {
  adminToken = data.adminToken;

  group('Worker Authentication', () => {
    testWorkerRegistration();
    sleep(1);
  });

  group('Premium Calculation', () => {
    testPremiumCalculation();
    sleep(1);
  });

  group('Fraud Scoring', () => {
    testFraudScoring();
    sleep(1);
  });

  group('Trigger Events', () => {
    testTriggerCreation();
    sleep(1);
  });

  group('Admin Dashboard', () => {
    testAdminDashboard();
    sleep(1);
  });

  group('Fraud Rings Detection', () => {
    testFraudRings();
    sleep(1);
  });
}

function testWorkerRegistration() {
  const payload = {
    phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    name: `Worker-${Math.random()}`,
    email: `worker${Date.now()}@gigcare.app`,
    platform: 'ZOMATO',
  };

  const res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, { 'registration succeeds': (r) => r.status === 200 || r.status === 201 });
  errorRate.add(res.status !== 200 && res.status !== 201);
}

function testPremiumCalculation() {
  const payload = {
    zone_id: 'zone_02',
    platform: 'ZOMATO',
    avg_daily_income: 650 + Math.random() * 200,
  };

  const res = http.post(`${BASE_URL}/api/premiums/calculate`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'premium calculation succeeds': (r) => r.status === 200,
    'premium response has quote_id': (r) => JSON.parse(r.body).quote_id !== undefined,
  });
  errorRate.add(res.status !== 200);
}

function testFraudScoring() {
  const claims = Math.floor(Math.random() * 5);
  const payload = {
    worker_id: `worker-${Math.random()}`,
    device_fingerprint: `device-${Math.random()}`,
    ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    wifi_ssids: ['HOME_WIFI', 'OFFICE_WIFI'],
    claim_city_id: 'BLR',
    worker_registered_city_id: 'BLR',
    features: {
      gps_cell_offset_km: Math.random() * 0.5,
      gps_wifi_offset_km: Math.random() * 0.3,
      implied_max_speed_kmh: 20 + Math.random() * 30,
      accelerometer_mag: 8 + Math.random() * 2,
      claim_cluster_10min: claims,
      claims_last_7_days: Math.floor(Math.random() * 3),
      seconds_since_trigger: 180 + Math.random() * 200,
    },
    enable_nlp_enhancement: Math.random() > 0.5,
    claim_notes: 'Delivery disrupted due to heavy rain',
  };

  const startTime = new Date();
  const res = http.post(`${ML_BASE_URL}/score-claim`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
  const duration = new Date() - startTime;

  check(res, {
    'fraud scoring succeeds': (r) => r.status === 200,
    'fraud response has action': (r) => JSON.parse(r.body).action !== undefined,
    'fraud response has trust_score': (r) => JSON.parse(r.body).trust_score !== undefined,
  });

  fraudValidationTime.add(duration < 200); // 200ms threshold
  errorRate.add(res.status !== 200);
}

function testTriggerCreation() {
  if (!adminToken) return;

  const payload = {
    zone_id: 'zone_02',
    city_id: 'BLR',
    trigger_type: 'HEAVY_RAIN',
    trigger_value: 60 + Math.random() * 40,
  };

  const res = http.post(`${BASE_URL}/api/admin/trigger-event`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });

  check(res, {
    'trigger creation succeeds': (r) => r.status === 200 || r.status === 201,
    'trigger response has event_id': (r) => JSON.parse(r.body).event_id !== undefined || JSON.parse(r.body).data?.event_id !== undefined,
  });
  errorRate.add(res.status !== 200 && res.status !== 201);
}

function testAdminDashboard() {
  if (!adminToken) return;

  const res = http.get(`${BASE_URL}/api/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  check(res, {
    'dashboard succeeds': (r) => r.status === 200,
    'dashboard has metrics': (r) => JSON.parse(r.body).metrics !== undefined || JSON.parse(r.body).data !== undefined,
  });
  errorRate.add(res.status !== 200);
}

function testFraudRings() {
  const res = http.get(`${ML_BASE_URL}/rings`);

  check(res, {
    'fraud rings succeeds': (r) => r.status === 200,
    'fraud rings response has data': (r) => JSON.parse(r.body).data !== undefined || JSON.parse(r.body).count !== undefined,
  });
  errorRate.add(res.status !== 200);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Simple text summary function (k6 built-in would be used in actual deployment)
function textSummary(data, options) {
  return '=== Load Test Results ===\n' + JSON.stringify(data, null, 2);
}
