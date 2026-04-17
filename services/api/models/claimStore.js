const fallbackClaims = [];

function ensureTimestamp(claim) {
  return {
    ...claim,
    created_at: claim.created_at || new Date().toISOString(),
  };
}

function upsertFallbackClaim(claim) {
  const normalized = ensureTimestamp(claim);
  const existingIndex = fallbackClaims.findIndex((item) => item.claim_id === normalized.claim_id);

  if (existingIndex >= 0) {
    fallbackClaims[existingIndex] = { ...fallbackClaims[existingIndex], ...normalized };
    return fallbackClaims[existingIndex];
  }

  fallbackClaims.push(normalized);

  // Keep memory bounded for long-running dev sessions.
  if (fallbackClaims.length > 5000) {
    fallbackClaims.splice(0, fallbackClaims.length - 5000);
  }

  return normalized;
}

function listFallbackClaims() {
  return [...fallbackClaims];
}

function listFallbackClaimsForUser(userId) {
  return fallbackClaims
    .filter((claim) => claim.user_id === userId || claim.worker_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function findFallbackClaimMatch({ policyId, eventId, triggerType, sinceIso }) {
  const since = sinceIso ? new Date(sinceIso).getTime() : null;

  return fallbackClaims.find((claim) => {
    const samePolicy = claim.policy_id === policyId;
    if (!samePolicy) {
      return false;
    }

    if (eventId && claim.trigger_event_id === eventId) {
      return true;
    }

    const sameTrigger = triggerType && claim.trigger_type === triggerType;
    if (!sameTrigger) {
      return false;
    }

    if (!since) {
      return true;
    }

    const createdAt = claim.created_at ? new Date(claim.created_at).getTime() : 0;
    return createdAt >= since;
  }) || null;
}

function sumFallbackClaimsForUser({ userId, sinceIso, statuses = ['APPROVED', 'PAID'] }) {
  const since = sinceIso ? new Date(sinceIso).getTime() : null;
  const normalizedStatuses = new Set((statuses || []).map((status) => String(status || '').toUpperCase()));

  return fallbackClaims.reduce((sum, claim) => {
    const claimantId = claim.user_id || claim.worker_id;
    if (claimantId !== userId) {
      return sum;
    }

    if (normalizedStatuses.size > 0 && !normalizedStatuses.has(String(claim.status || '').toUpperCase())) {
      return sum;
    }

    if (since) {
      const createdAt = claim.created_at ? new Date(claim.created_at).getTime() : 0;
      if (createdAt < since) {
        return sum;
      }
    }

    return sum + Number(claim.final_payout || 0);
  }, 0);
}

module.exports = {
  upsertFallbackClaim,
  listFallbackClaims,
  listFallbackClaimsForUser,
  findFallbackClaimMatch,
  sumFallbackClaimsForUser,
};
