// services/api/routes/auth.js
const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const OTP_EXPIRATION_MS = 10 * 60 * 1000;
const pendingOtps = new Map();

const transportConfig = process.env.SMTP_HOST
  ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }
  : null;

const transporter = transportConfig ? nodemailer.createTransport(transportConfig) : null;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpEmail = async (email, code) => {
  const message = {
    from: process.env.EMAIL_FROM || 'no-reply@gigcare.app',
    to: email,
    subject: 'Your GigCare OTP code',
    text: `Your GigCare OTP code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your GigCare OTP code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  };

  if (!transporter) {
    console.log(`📩 OTP for ${email}: ${code} (SMTP not configured)`);
    return;
  }

  try {
    const result = await transporter.sendMail(message);
    console.log(`📧 OTP email sent successfully to ${email} (Message ID: ${result.messageId})`);
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw error; // Re-throw to be caught by the calling function
  }
};

const createPendingOtp = (email, mode, payload) => {
  const code = generateOtp();
  const key = `${email.toLowerCase()}:${mode}`;
  pendingOtps.set(key, {
    code,
    expiresAt: Date.now() + OTP_EXPIRATION_MS,
    payload,
  });
  return code;
};

const consumePendingOtp = (email, mode, code) => {
  const key = `${email.toLowerCase()}:${mode}`;
  const pending = pendingOtps.get(key);
  if (!pending || pending.code !== code || pending.expiresAt < Date.now()) {
    return null;
  }
  pendingOtps.delete(key);
  return pending.payload;
};

const createJwtToken = (profile) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined');
  }

  return jwt.sign(
    {
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

router.post('/register', async (req, res) => {
  try {
    const { email, name, phone, platform, zone_id, latitude, longitude } = req.body;
    if (!email || !name || !phone || !platform || !zone_id) {
      return res.status(422).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;

    const existingProfile = await db.getProfileByEmailOrPhone(normalizedEmail, normalizedPhone);
    if (existingProfile) {
      return res.status(409).json({ error: 'User already exists', code: 'USER_EXISTS' });
    }

    const otpCode = createPendingOtp(normalizedEmail, 'register', {
      email: normalizedEmail,
      name: name.trim(),
      phone: normalizedPhone,
      platform,
      zone_id,
      latitude: latitude || null,
      longitude: longitude || null,
      location_verified: !!latitude && !!longitude,
    });

    await sendOtpEmail(normalizedEmail, otpCode);

    res.json({
      data: { email: normalizedEmail },
      message: 'OTP sent for registration. Check your inbox.',
    });
  } catch (err) {
    console.error('Registration OTP error:', err);
    res.status(500).json({ error: 'Failed to start registration', code: 'REGISTRATION_FAILED' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ error: 'Email is required', code: 'MISSING_EMAIL' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const profile = await db.getProfileByEmail(normalizedEmail);

    if (!profile) {
      return res.status(404).json({ error: 'Email not found', code: 'USER_NOT_FOUND' });
    }

    const otpCode = createPendingOtp(normalizedEmail, 'login', { email: normalizedEmail });
    await sendOtpEmail(normalizedEmail, otpCode);

    res.json({ data: { email: normalizedEmail }, message: 'OTP sent for login.' });
  } catch (err) {
    console.error('Login OTP error:', err);
    res.status(500).json({ error: 'Failed to send login OTP', code: 'LOGIN_OTP_FAILED' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(422).json({ error: 'Email and OTP are required', code: 'MISSING_FIELDS' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registrationPayload = consumePendingOtp(normalizedEmail, 'register', otp);

    let profile = null;

    if (registrationPayload) {
      const profileData = {
        id: uuidv4(),
        full_name: registrationPayload.name,
        email: registrationPayload.email,
        phone: registrationPayload.phone,
        role: 'worker',
        platform: registrationPayload.platform,
        zone_id: registrationPayload.zone_id,
        last_known_latitude: registrationPayload.latitude,
        last_known_longitude: registrationPayload.longitude,
        location_verified: registrationPayload.location_verified,
      };

      const { data, error } = await db.createProfile(profileData);
      if (error) {
        throw error;
      }
      profile = data;
    } else {
      const loginPayload = consumePendingOtp(normalizedEmail, 'login', otp);
      if (!loginPayload) {
        return res.status(401).json({ error: 'Invalid or expired OTP', code: 'INVALID_OTP' });
      }

      profile = await db.getProfileByEmail(normalizedEmail);
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found', code: 'PROFILE_NOT_FOUND' });
      }
    }

    const token = createJwtToken(profile);
    res.json({ data: { token, profile } });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(err.code === 'INVALID_OTP' ? 401 : 500).json({
      error: err.message || 'OTP verification failed',
      code: err.code || 'OTP_VERIFICATION_FAILED',
    });
  }
});

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
