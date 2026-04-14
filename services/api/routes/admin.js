// services/api/routes/admin.js
const express = require('express');
const axios = require('axios');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../models/supabase');

const router = express.Router();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

// =====================================================
// POST /api/admin/trigger-event
// Admin fires a trigger event manually (for demo)
// =====================================================
router.post('/trigger-event', authMiddleware('admin'), async (req, res) => {
  try {
    const { zone_id, trigger_type, trigger_value } = req.body;

    if (!zone_id || !trigger_type || trigger_value === undefined) {
      return res.status(422).json({
        error: 'Missing required fields: zone_id, trigger_type, trigger_value',
        code: 'MISSING_FIELDS',
      });
    }

    // Create event via Supabase
    const severity = trigger_type === 'HEAVY_RAIN' ? 1.3 : trigger_type === 'POOR_AQI' && trigger_value >= 400 ? 1.5 : 1.0;
    
    const { data: event, error: eventError } = await db.createTriggerEvent(
      zone_id, 
      trigger_type, 
      trigger_value, 
      severity
    );

    if (eventError) throw eventError;

    // Call auto-create endpoint internally
    try {
      const claimsRes = await axios.post(`${API_URL}/api/claims/auto-create`, {
        zone_id,
        trigger_type,
        trigger_value,
        disruption_hours: 3,
        severity_factor: severity,
        event_id: event.event_id,
      }, {
        headers: { 'x-internal-service-key': INTERNAL_SERVICE_KEY },
      });

      res.status(201).json({
        data: {
          ...event,
          claims_created: claimsRes.data.data?.length || 0,
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
// GET /api/admin/dashboard
// Get dashboard metrics using Supabase RPC or simple aggregates
// =====================================================
router.get('/dashboard', authMiddleware('admin'), async (req, res) => {
  try {
    // 1. Total Premiums
    const { data: premiumsData } = await supabase
      .from('policies')
      .select('premium_paid')
      .eq('status', 'ACTIVE');
    const totalPremiums = (premiumsData || []).reduce((sum, p) => sum + p.premium_paid, 0);

    // 2. Total Payouts
    const { data: payoutsData } = await supabase
      .from('claims')
      .select('final_payout')
      .eq('status', 'PAID');
    const totalPayouts = (payoutsData || []).reduce((sum, c) => sum + (c.final_payout || 0), 0);

    // 3. Claims by Status
    const { data: statusData } = await supabase
      .from('claims')
      .select('status');
    const claimsByStatus = (statusData || []).reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    // 4. Recent Claims
    const { data: recentClaims } = await supabase
      .from('claims')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      data: {
        loss_ratio_percent: totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0,
        total_premiums_collected: totalPremiums,
        total_payouts: totalPayouts,
        claims_today: 0, // Simplified for demo
        claims_by_status: claimsByStatus,
        recent_claims: recentClaims,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard', code: 'DASHBOARD_FETCH_FAILED' });
  }
});

module.exports = router;
