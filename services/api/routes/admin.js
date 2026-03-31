// services/api/routes/admin.js
// Admin endpoints - Person A

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

// =====================================================
// POST /api/admin/trigger-event
// Admin fires a trigger event manually (for demo)
// =====================================================
router.post('/trigger-event', authMiddleware('ADMIN'), async (req, res) => {
  try {
    const { zone_id, trigger_type, trigger_value } = req.body;

    if (!zone_id || !trigger_type || trigger_value === undefined) {
      return res.status(422).json({
        error: 'Missing required fields: zone_id, trigger_type, trigger_value',
        code: 'MISSING_FIELDS',
      });
    }

    // Create event
    const event_id = `ev-${uuidv4().substring(0, 8)}`;
    const severity = trigger_type === 'HEAVY_RAIN' ? 1.3 : trigger_type === 'POOR_AQI' && trigger_value >= 400 ? 1.5 : 1.0;
    const multiplier = new Date().getHours() >= 18 && new Date().getHours() <= 21 ? 1.2 : 1.0;

    await db.createTriggerEvent(event_id, zone_id, trigger_type, trigger_value, severity, multiplier, 45);

    // Call auto-create endpoint internally
    try {
      const claimsRes = await axios.post(`${API_URL}/api/claims/auto-create`, {
        zone_id,
        trigger_type,
        trigger_value,
        disruption_hours: 3,
        severity_factor: severity,
        peak_multiplier: multiplier,
        event_id,
      }, {
        headers: { 'x-internal-service-key': INTERNAL_SERVICE_KEY },
      });

      res.status(201).json({
        data: {
          event_id,
          zone_id,
          trigger_type,
          trigger_value,
          claims_created: claimsRes.data.data?.length || 0,
          claims: claimsRes.data.data || [],
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (claimErr) {
      console.error('Auto-create claims error:', claimErr.message);
      res.status(500).json({ error: 'Failed to create claims', code: 'CLAIMS_CREATION_FAILED' });
    }
  } catch (err) {
    console.error('Trigger event error:', err);
    res.status(500).json({ error: 'Failed to create trigger event', code: 'TRIGGER_FAILED' });
  }
});

// =====================================================
// GET /api/admin/claims
// Get all claims with filters
// =====================================================
router.get('/claims', authMiddleware('ADMIN'), async (req, res) => {
  try {
    const { status, zone_id, limit = 100 } = req.query;

    let query = 'SELECT c.*, w.name, w.phone, z.name as zone_name FROM claims c JOIN workers w ON c.worker_id = w.worker_id JOIN policies p ON c.policy_id = p.policy_id JOIN zones z ON p.worker_id IS NOT NULL WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND c.status = $' + (params.length + 1);
      params.push(status);
    }
    if (zone_id) {
      query += ' AND z.zone_id = $' + (params.length + 1);
      params.push(zone_id);
    }

    query += ' ORDER BY c.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await db.query(query, params);
    res.json({
      data: result.rows,
      meta: { timestamp: new Date().toISOString(), count: result.rows.length },
    });
  } catch (err) {
    console.error('Admin claims fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch claims', code: 'CLAIMS_FETCH_FAILED' });
  }
});

// =====================================================
// GET /api/admin/dashboard
// Get dashboard metrics
// =====================================================
router.get('/dashboard', authMiddleware('ADMIN'), async (req, res) => {
  try {
    // Total premiums
    const premiumsRes = await db.query('SELECT COALESCE(SUM(premium_paid), 0) as total FROM policies WHERE status = $1', ['ACTIVE']);
    const totalPremiums = premiumsRes.rows[0].total || 0;

    // Total payouts
    const payoutsRes = await db.query('SELECT COALESCE(SUM(final_payout), 0) as total FROM claims WHERE status = $1', ['PAID']);
    const totalPayouts = payoutsRes.rows[0].total || 0;

    // Loss ratio
    const lossRatio = totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0;

    // Claims by status
    const statusRes = await db.query('SELECT status, COUNT(*) as count FROM claims GROUP BY status');
    const claimsByStatus = {};
    statusRes.rows.forEach(row => {
      claimsByStatus[row.status] = row.count;
    });

    // Recent claims
    const recentRes = await db.query('SELECT * FROM claims ORDER BY created_at DESC LIMIT 10');

    // Total today
    const todayRes = await db.query("SELECT COUNT(*) as count FROM claims WHERE DATE(created_at) = CURRENT_DATE");
    const claimsToday = todayRes.rows[0].count || 0;

    res.json({
      data: {
        loss_ratio_percent: lossRatio,
        total_premiums_collected: totalPremiums,
        total_payouts: totalPayouts,
        claims_today: claimsToday,
        claims_by_status: claimsByStatus,
        pending_review_count: claimsByStatus['FLAGGED'] || 0,
        fraud_rings_active: 0, // Phase 3
        recent_claims: recentRes.rows,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard', code: 'DASHBOARD_FETCH_FAILED' });
  }
});

// =====================================================
// GET /api/admin/fraud-rings
// Get active fraud rings (Phase 3)
// =====================================================
router.get('/fraud-rings', authMiddleware('ADMIN'), async (req, res) => {
  res.json({
    data: {
      active_rings: [],
      temporal_spikes: [],
      note: 'Fraud ring detection coming in Phase 3',
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

module.exports = router;
