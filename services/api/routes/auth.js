// services/api/routes/auth.js
const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// GET /api/auth/me
// Get current user profile (Worker or Admin)
// =====================================================
router.get('/me', authMiddleware(), async (req, res) => {
  try {
    const profile = req.user.profile;

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    res.json({
      data: profile,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'PROFILE_FETCH_FAILED',
    });
  }
});

// =====================================================
// POST /api/auth/complete-profile
// Update worker profile with platform and zone after login
// =====================================================
router.post('/complete-profile', authMiddleware('worker'), async (req, res) => {
  try {
    const { user_id } = req.user;
    const { phone, name, platform, zone_id } = req.body;

    if (!phone || !name || !platform || !zone_id) {
      return res.status(422).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }

    const { data: profile, error } = await db.updateProfile(user_id, {
      full_name: name,
      phone,
      platform,
      zone_id,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    res.json({
      data: profile,
      message: 'Profile completed successfully',
    });
  } catch (err) {
    console.error('Profile completion error:', err);
    res.status(500).json({
      error: 'Failed to complete profile',
      code: 'PROFILE_COMPLETION_FAILED',
    });
  }
});

module.exports = router;
