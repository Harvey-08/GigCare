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

module.exports = {
  upsertFallbackClaim,
  listFallbackClaims,
  listFallbackClaimsForUser,
};
