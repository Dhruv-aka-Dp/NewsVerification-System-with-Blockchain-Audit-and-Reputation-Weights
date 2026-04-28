const rateLimit = require('express-rate-limit');

const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  keyGenerator: (req) => {
    // Key by authenticated user id if available, else IP
    return (req.user && req.user.userId) ? req.user.userId : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Vote rate limit exceeded' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for auth endpoints — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many authentication attempts, please try again later' });
  },
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in tests
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { voteLimiter, authLimiter };
