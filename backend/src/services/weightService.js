const { LAMBDA_DECAY } = require('../config/constants');

/**
 * Compute the influence weight for a user on a vote.
 * w_i = (0.5 + R_i / 100) * c_i * exp(-lambda * t) * anomalyEta
 *
 * @param {Object} user - Mongoose User document
 * @param {number} confidenceLevel - vote confidence: 0.5, 1.0, or 1.5
 * @returns {number} w_i
 */
function computeWeight(user, confidenceLevel) {
  const R = typeof user.reputation === 'number' ? user.reputation : 25;
  const w_base = 0.5 + R / 100;

  const lastActivity = user.lastValidatedActivity
    ? new Date(user.lastValidatedActivity)
    : new Date();
  const nowMs = Date.now();
  const tHours = (nowMs - lastActivity.getTime()) / (1000 * 60 * 60);

  const decay = Math.exp(-LAMBDA_DECAY * tHours);
  const eta = typeof user.anomalyEta === 'number' ? user.anomalyEta : 1.0;

  return w_base * confidenceLevel * decay * eta;
}

module.exports = { computeWeight };
