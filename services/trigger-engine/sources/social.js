// services/trigger-engine/sources/social.js
// Simulated social disruption feed for curfew/zone closure/app outage events.

function getSocialDisruption(cityId) {
  const mockMode = process.env.USE_MOCK_DATA === 'true';

  if (!mockMode) {
    return null;
  }

  const roll = Math.random();

  // Curfew / closure: low frequency but high impact.
  if (roll > 0.93) {
    return {
      type: 'CURFEW',
      value: 1,
      severity_factor: 1.4,
      reason: `Mock local curfew signal in ${cityId}`,
    };
  }

  // Platform outage: medium frequency, lower payout severity than curfew.
  if (roll > 0.86) {
    return {
      type: 'APP_OUTAGE',
      value: 1,
      severity_factor: 1.2,
      reason: `Mock platform outage signal in ${cityId}`,
    };
  }

  return null;
}

module.exports = {
  getSocialDisruption,
};
