const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function reviewerOnly(req, res, next) {
  if (!req.user || !req.user.is_reviewer) {
    return res.status(403).json({ error: 'Reviewer access required' });
  }
  next();
}

/**
 * Block unverified users from performing actions (voting, submitting).
 * Seed/reviewer users auto-verified at creation bypass this check.
 */
function verifiedOnly(req, res, next) {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({ error: 'Account not verified. An admin must approve your account before you can participate.' });
  }
  next();
}

module.exports = { authMiddleware, reviewerOnly, verifiedOnly };
