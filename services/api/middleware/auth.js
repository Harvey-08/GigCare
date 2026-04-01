// services/api/middleware/auth.js
// JWT middleware - Person A

const jwt = require('jsonwebtoken');

// =====================================================
// AUTH MIDDLEWARE: Verify JWT
// =====================================================
const authMiddleware = (requiredRole = null) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No authorization token provided',
      code: 'NO_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (requiredRole && decoded.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
};

// =====================================================
// GENERATE JWT
// =====================================================
const generateToken = (user_id, role = 'WORKER') => {
  const payload = {
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  // Add appropriate ID based on role
  if (role === 'ADMIN') {
    payload.admin_id = user_id;
  } else {
    payload.worker_id = user_id;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
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
  generateToken,
  internalServiceAuth,
};
