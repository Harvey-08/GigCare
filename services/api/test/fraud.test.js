const request = require('supertest');

process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';
process.env.FRAUD_SERVICE_URL = 'http://fraud-service.test';
process.env.DAILY_PAYOUT_CAP_RUPEES = '3600';
process.env.ENABLE_NLP_FRAUD_ENHANCEMENT = 'true';

const makeBuilder = ({ data = [], error = null, count = 0, maybeSingleData = null, singleData = null } = {}) => {
  const builder = {
    data,
    error,
    count,
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    maybeSingle: jest.fn(async () => ({ data: maybeSingleData, error: null })),
    single: jest.fn(async () => ({ data: singleData, error: null })),
  };

  return builder;
};

const activePolicy = {
  policy_id: 'policy-1',
  user_id: 'worker-1',
  worker_id: 'worker-1',
  max_payout: 1800,
  week_start: '2026-04-17',
  week_end: '2026-04-23',
  profiles: {
    id: 'worker-1',
    zone_id: 'HYD_27_02',
    avg_daily_income: 800,
  },
};

jest.mock('../models/db', () => ({
  getActivePoliciesInZone: jest.fn(),
  getActivePoliciesInCity: jest.fn(),
}));

jest.mock('../models/claimStore', () => ({
  findFallbackClaimMatch: jest.fn(() => null),
  sumFallbackClaimsForUser: jest.fn(() => 0),
  upsertFallbackClaim: jest.fn((claim) => claim),
  listFallbackClaims: jest.fn(() => []),
  listFallbackClaimsForUser: jest.fn(() => []),
}));

jest.mock('../models/reputationStore', () => ({
  getWorkerReputation: jest.fn(),
  recordOutcome: jest.fn(),
  getSharedIdentityWorkerCount: jest.fn(),
}));

jest.mock('../services/payout-service', () => ({
  initiateUpiPayout: jest.fn(),
}));

jest.mock('../models/supabase', () => ({
  from: jest.fn(),
}));

const db = require('../models/db');
const supabase = require('../models/supabase');
const claimStore = require('../models/claimStore');
const reputationStore = require('../models/reputationStore');
const { initiateUpiPayout } = require('../services/payout-service');

const makeClaimsBuilder = ({ maybeSingleData = null, singleData = null } = {}) =>
  makeBuilder({
    data: [],
    count: 0,
    maybeSingleData,
    singleData,
  });

beforeEach(() => {
  jest.clearAllMocks();
  let lastInsertPayload = null;

  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      trust_score: 0.92,
      action: 'APPROVED',
      explanation: 'ok',
    }),
  }));

  db.getActivePoliciesInCity.mockResolvedValue({ data: [activePolicy], error: null });
  db.getActivePoliciesInZone.mockResolvedValue({ data: [activePolicy], error: null });
  reputationStore.getWorkerReputation.mockResolvedValue({
    risk_score: 0.1,
    event_count: 2,
    approved_count: 2,
    flagged_count: 0,
    denied_count: 0,
    updated_at: new Date().toISOString(),
  });
  reputationStore.getSharedIdentityWorkerCount.mockResolvedValue(1);
  reputationStore.recordOutcome.mockResolvedValue(null);
  claimStore.findFallbackClaimMatch.mockReturnValue(null);
  claimStore.sumFallbackClaimsForUser.mockReturnValue(0);
  claimStore.upsertFallbackClaim.mockImplementation((claim) => claim);
  initiateUpiPayout.mockResolvedValue({ success: true, simulated: true });

  supabase.from.mockImplementation((table) => {
    if (table === 'claims') {
      const builder = makeClaimsBuilder({ maybeSingleData: null });
      builder.insert = jest.fn((payload) => {
        lastInsertPayload = payload;
        return builder;
      });
      builder.single = jest.fn(async () => ({
        data: {
          claim_id: 'claim-1',
          policy_id: lastInsertPayload?.policy_id || activePolicy.policy_id,
          user_id: lastInsertPayload?.user_id || activePolicy.user_id,
          worker_id: lastInsertPayload?.worker_id || activePolicy.worker_id,
          trigger_event_id: lastInsertPayload?.trigger_event_id || 'event-1',
          trigger_type: lastInsertPayload?.trigger_type || 'POOR_AQI',
          final_payout: lastInsertPayload?.final_payout ?? 250,
          status: lastInsertPayload?.status || 'APPROVED',
          fraud_reason: lastInsertPayload?.fraud_reason || 'ok',
          created_at: new Date().toISOString(),
        },
        error: null,
      }));
      return builder;
    }

    return makeBuilder();
  });
});

describe('Fraud API', () => {
  it('forwards worker history and claim notes to the fraud scorer', async () => {
    const app = require('../server');

    const response = await request(app)
      .post('/api/fraud/auto-create')
      .set('x-internal-service-key', 'test-internal-key')
      .send({
        city_id: 'HYD',
        trigger_type: 'POOR_AQI',
        trigger_value: 410,
        disruption_hours: 3,
        severity_factor: 1.2,
        peak_multiplier: 1.0,
        event_id: 'fraud-nlp-1',
        claim_signals: {
          device_fingerprint: 'device-1',
          ip_address: '10.0.0.1',
        },
      });

    expect(response.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.worker_history).toMatchObject({
      total_claims: 0,
      approved_claims_ratio: 1,
      recent_claims_24h: 0,
      recent_flagged_24h: 0,
      historical_risk_score: 0.1,
    });
    expect(body.claim_notes).toMatch(/claim triggered by poor aqi/i);
    expect(body.enable_nlp_enhancement).toBe(true);
    expect(initiateUpiPayout).toHaveBeenCalledTimes(1);
  });

  it('does not auto-payout partial claims', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        trust_score: 0.65,
        action: 'PARTIAL',
        explanation: 'requires review',
      }),
    });

    const app = require('../server');

    const response = await request(app)
      .post('/api/fraud/auto-create')
      .set('x-internal-service-key', 'test-internal-key')
      .send({
        city_id: 'HYD',
        trigger_type: 'POOR_AQI',
        trigger_value: 410,
        disruption_hours: 3,
        severity_factor: 1.2,
        peak_multiplier: 1.0,
        event_id: 'fraud-nlp-2',
        claim_signals: {
          device_fingerprint: 'device-2',
          ip_address: '10.0.0.2',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.data[0].status).toBe('PARTIAL');
    expect(initiateUpiPayout).not.toHaveBeenCalled();
  });
});
