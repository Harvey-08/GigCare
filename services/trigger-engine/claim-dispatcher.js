const axios = require('axios');

async function dispatchClaims(event) {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const internalKey = process.env.INTERNAL_SERVICE_KEY;

    const response = await axios.post(`${apiUrl}/api/fraud/auto-create`, event, {
      headers: { 'x-internal-service-key': internalKey },
      timeout: 5000,
    });

    console.log(`      ✅ Created ${response.data.data?.length || 0} fraud-scored claims`);
    return response.data;
  } catch (error) {
    console.error(`      ❌ Failed to dispatch claims: ${error.message}`);
    throw error;
  }
}

module.exports = {
  dispatchClaims,
};