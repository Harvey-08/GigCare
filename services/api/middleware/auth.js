// services/api/middleware/auth.js
// JWT middleware for custom email OTP auth

const jwt = require('jsonwebtoken');
const supabase = require('../models/supabase');

const authMiddleware = (requiredRole = null) => async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No authorization token provided',
      code: 'NO_TOKEN',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = jwt.verify(token, secret);
    const userId = payload.sub || payload.user_id;

    if (!userId) {
      throw new Error('Invalid token payload');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    if (requiredRole && profile.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    req.user = {
      user_id: userId,
      role: profile.role,
      profile,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
};

// =====================================================
// INTERNAL SERVICE AUTH (for trigger engine)
// =====================================================
const internalServiceAuth = (req, res, next) => {
  const key = req.headers['x-internal-service-key'];
  if (key !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      error: 'Invalid internal service key',
      code: 'INVALID_SERVICE_KEY',
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  internalServiceAuth,
};
