// services/api/routes/auth.js
// Authentication endpoints - Person A

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// POST /api/auth/register
// Register a new worker and return JWT
// =====================================================
router.post('/register', async (req, res) => {
  try {
    const { phone, name, platform, zone_id } = req.body;

    // Validation
    if (!phone || !name || !platform || !zone_id) {
      return res.status(422).json({
        error: 'Missing required fields: phone, name, platform, zone_id',
        code: 'MISSING_FIELDS',
      });
    }

    // Check phone uniqueness
    const existing = await db.query('SELECT worker_id FROM workers WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Phone number already registered',
        code: 'PHONE_EXISTS',
      });
    }

    // Check zone exists
    const zone = await db.getZone(zone_id);
    if (zone.rows.length === 0) {
      return res.status(404).json({
        error: 'Zone not found',
        code: 'ZONE_NOT_FOUND',
        field: 'zone_id',
      });
    }

    // Create worker
    const worker_id = `w-${uuidv4().substring(0, 8)}`;
    const result = await db.createWorker(worker_id, name, phone, platform, zone_id);

    if (result.rows.length === 0) {
      throw new Error('Worker creation failed');
    }

    const worker = result.rows[0];
    const token = generateToken(worker_id, 'WORKER');

    res.status(201).json({
      data: {
        worker_id,
        name: worker.name,
        phone: worker.phone,
        platform: worker.platform,
        zone_id: worker.zone_id,
        token,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_FAILED',
    });
  }
});

// =====================================================
// POST /api/auth/login
// Mock login with OTP (OTP is hardcoded as 123456 for demo)
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(422).json({
        error: 'Missing required fields: phone, otp',
        code: 'MISSING_FIELDS',
      });
    }

    // For demo: accept OTP 123456
    const DEMO_OTP = '123456';
    if (otp !== DEMO_OTP) {
      return res.status(401).json({
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
      });
    }

    // Find worker by phone
    const result = await db.query('SELECT worker_id FROM workers WHERE phone = $1', [phone]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Worker not found',
        code: 'WORKER_NOT_FOUND',
      });
    }

    const worker_id = result.rows[0].worker_id;
    const token = generateToken(worker_id, 'WORKER');

    res.json({
      data: {
        worker_id,
        token,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_FAILED',
    });
  }
});

// =====================================================
// GET /api/auth/me
// Get current worker profile (requires JWT)
// =====================================================
router.get('/me', authMiddleware('WORKER'), async (req, res) => {
  try {
    const { worker_id } = req.user;
    const result = await db.getWorker(worker_id);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Worker not found',
        code: 'WORKER_NOT_FOUND',
      });
    }

    const worker = result.rows[0];
    res.json({
      data: worker,
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

module.exports = router;
