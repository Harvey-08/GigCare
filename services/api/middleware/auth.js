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
    let userId = null;
    let decodedPayload = null;
    const secret = process.env.JWT_SECRET;

    if (secret) {
      try {
        decodedPayload = jwt.verify(token, secret);
        userId = decodedPayload.sub || decodedPayload.user_id;
      } catch (jwtError) {
        // Fallback to Supabase token validation to support admin app sessions.
      }
    }

    if (!userId) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authData?.user?.id) {
        userId = authData.user.id;
      }
    }

    if (!userId) {
      throw new Error('Invalid token payload');
    }

    if (requiredRole === 'admin' && decodedPayload?.role === 'admin') {
      req.user = {
        user_id: userId,
        role: 'admin',
        profile: {
          id: userId,
          email: decodedPayload.email,
          role: 'admin',
          full_name: decodedPayload.full_name || 'System Admin',
        },
      };
      return next();
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
