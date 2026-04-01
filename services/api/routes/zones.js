// services/api/routes/zones.js
// Zone endpoints - Person A

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// GET /api/zones - List all zones
router.get('/', async (req, res) => {
  try {
    const result = await db.getZones();
    res.json({
      data: result.rows,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zones fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch zones', code: 'ZONES_FETCH_FAILED' });
  }
});

// GET /api/zones/:zone_id/risk - Get zone risk details
router.get('/:zone_id/risk', async (req, res) => {
  try {
    const result = await db.getZone(req.params.zone_id);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found', code: 'ZONE_NOT_FOUND' });
    }
    const zone = result.rows[0];
    res.json({
      data: {
        zone_id: zone.zone_id,
        name: zone.name,
        zone_risk_score: zone.zone_risk_score,
        zone_risk_level: zone.zone_risk_level,
        flood_prone: zone.flood_prone,
        historical_claim_rate: 0.15, // mock
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Zone risk fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch zone risk', code: 'ZONE_RISK_FETCH_FAILED' });
  }
});

module.exports = router;
