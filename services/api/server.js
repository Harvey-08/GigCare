// services/api/server.js
// Express server setup - Person A

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
const allowedOrigins = [
  'http://localhost:3010',
  'http://localhost:3013',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log(`  Auth: ${req.headers.authorization.substring(0, 20)}...`);
  } else {
    console.log('  Auth: NONE');
  }
  next();
});

// =====================================================
// ROUTES
// =====================================================
app.use('/auth', require('./routes/auth'));
app.use('/zones', require('./routes/zones'));
app.use('/premiums', require('./routes/premiums'));
app.use('/policies', require('./routes/policies'));
app.use('/claims', require('./routes/claims'));
app.use('/admin', require('./routes/admin'));
app.use('/webhooks', require('./routes/webhooks'));

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// ERROR HANDLING
// =====================================================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 GigCare API + Supabase running on port ${PORT}`);
  console.log(`📊 Supabase Project: ${process.env.SUPABASE_URL}`);
});

module.exports = app;
