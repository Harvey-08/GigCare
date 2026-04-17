const supabase = require('./supabase');

const inMemoryWorkerReputation = new Map();
const inMemoryIdentityLinks = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tableMissing(error) {
  return error && (error.code === 'PGRST205' || error.code === '42P01');
}

function nowIso() {
  return new Date().toISOString();
}

function identityKey(type, value) {
  return `${type}:${String(value || '').trim()}`;
}

function getRiskDelta(action) {
  const normalized = String(action || '').toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'PAID') return -0.04;
  if (normalized === 'PARTIAL') return 0.03;
  if (normalized === 'FLAGGED') return 0.08;
  if (normalized === 'DENIED') return 0.12;
  return 0.04;
}

function decayRisk(currentRisk, lastUpdatedAt) {
  if (!lastUpdatedAt) return clamp(currentRisk || 0, 0, 1);

  const ageMs = Date.now() - new Date(lastUpdatedAt).getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  const decayFactor = Math.exp(-0.06 * ageDays);
  return clamp((currentRisk || 0) * decayFactor, 0, 1);
}

async function linkIdentity(workerId, identityType, identityValue) {
  const normalizedValue = String(identityValue || '').trim();
  if (!workerId || !identityType || !normalizedValue) {
    return;
  }

  const payload = {
    worker_id: workerId,
    identity_type: identityType,
    identity_value: normalizedValue,
    link_count: 1,
    last_seen_at: nowIso(),
  };

  const { error } = await supabase
    .from('fraud_identity_links')
    .upsert(payload, { onConflict: 'worker_id,identity_type,identity_value' });

  if (error && !tableMissing(error)) {
    throw error;
  }

  if (error && tableMissing(error)) {
    const key = `${workerId}:${identityKey(identityType, normalizedValue)}`;
    const existing = inMemoryIdentityLinks.get(key) || { link_count: 0 };
    inMemoryIdentityLinks.set(key, {
      worker_id: workerId,
      identity_type: identityType,
      identity_value: normalizedValue,
      link_count: Number(existing.link_count || 0) + 1,
      last_seen_at: nowIso(),
    });
  }
}

async function getSharedIdentityWorkerCount(identityType, identityValue, lookbackDays = 90) {
  const normalizedValue = String(identityValue || '').trim();
  if (!identityType || !normalizedValue) {
    return 1;
  }

  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('fraud_identity_links')
    .select('worker_id')
    .eq('identity_type', identityType)
    .eq('identity_value', normalizedValue)
    .gte('last_seen_at', since);

  if (error && !tableMissing(error)) {
    throw error;
  }

  if (!error) {
    const uniqueWorkers = new Set((data || []).map((row) => row.worker_id).filter(Boolean));
    return Math.max(1, uniqueWorkers.size || 1);
  }

  const uniqueWorkers = new Set();
  for (const value of inMemoryIdentityLinks.values()) {
    if (value.identity_type === identityType && value.identity_value === normalizedValue) {
      uniqueWorkers.add(value.worker_id);
    }
  }
  return Math.max(1, uniqueWorkers.size || 1);
}

async function getWorkerReputation(workerId) {
  if (!workerId) {
    return {
      worker_id: null,
      risk_score: 0,
      event_count: 0,
      approved_count: 0,
      flagged_count: 0,
      denied_count: 0,
      updated_at: null,
      source: 'none',
    };
  }

  const { data, error } = await supabase
    .from('fraud_reputation')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (error && !tableMissing(error)) {
    throw error;
  }

  if (!error && data) {
    return {
      ...data,
      source: 'db',
    };
  }

  const fallback = inMemoryWorkerReputation.get(workerId);
  if (!fallback) {
    return {
      worker_id: workerId,
      risk_score: 0,
      event_count: 0,
      approved_count: 0,
      flagged_count: 0,
      denied_count: 0,
      updated_at: null,
      source: 'memory',
    };
  }

  return {
    ...fallback,
    source: 'memory',
  };
}

async function recordOutcome({ workerId, action, deviceFingerprint, ipAddress }) {
  if (!workerId) {
    return null;
  }

  await linkIdentity(workerId, 'device', deviceFingerprint);
  await linkIdentity(workerId, 'ip', ipAddress);

  const existing = await getWorkerReputation(workerId);
  const decayedRisk = decayRisk(Number(existing.risk_score || 0), existing.updated_at);
  const riskDelta = getRiskDelta(action);
  const updatedRisk = clamp(decayedRisk + riskDelta, 0, 1);

  const normalizedAction = String(action || '').toUpperCase();
  const payload = {
    worker_id: workerId,
    risk_score: updatedRisk,
    event_count: Number(existing.event_count || 0) + 1,
    approved_count: Number(existing.approved_count || 0) + (normalizedAction === 'APPROVED' || normalizedAction === 'PAID' ? 1 : 0),
    flagged_count: Number(existing.flagged_count || 0) + (normalizedAction === 'FLAGGED' || normalizedAction === 'PARTIAL' ? 1 : 0),
    denied_count: Number(existing.denied_count || 0) + (normalizedAction === 'DENIED' ? 1 : 0),
    last_device_fingerprint: String(deviceFingerprint || existing.last_device_fingerprint || ''),
    last_ip_address: String(ipAddress || existing.last_ip_address || ''),
    updated_at: nowIso(),
  };

  const { error } = await supabase
    .from('fraud_reputation')
    .upsert(payload, { onConflict: 'worker_id' });

  if (error && !tableMissing(error)) {
    throw error;
  }

  if (error && tableMissing(error)) {
    inMemoryWorkerReputation.set(workerId, payload);
  }

  return payload;
}

module.exports = {
  getWorkerReputation,
  recordOutcome,
  getSharedIdentityWorkerCount,
};
