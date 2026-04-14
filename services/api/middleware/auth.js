// services/api/middleware/auth.js
// JWT middleware - Person A

const supabase = require('../models/supabase');

// =====================================================
// AUTH MIDDLEWARE: Verify Supabase JWT and Role
// =====================================================
const authMiddleware = (requiredRole = null) => async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No authorization token provided',
      code: 'NO_TOKEN',
    });
  }

  try {
    // 1. Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    // 2. Fetch profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    // 3. Check role if required
    if (requiredRole && profile.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Attach user and profile to request
    req.user = { 
      ...user, 
      role: profile.role,
      user_id: user.id, // Primary ID for DB queries now
      profile 
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
