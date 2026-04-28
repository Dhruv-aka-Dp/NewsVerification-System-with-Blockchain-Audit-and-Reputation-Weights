const User = require('../models/User');
const Vote = require('../models/Vote');
const { ANOMALY_ETA } = require('../config/constants');

/**
 * After a vote is cast, check if the user has voted more than 20 times
 * in the last 10 minutes. If so, set anomalyEta = 0.3.
 * If anomalyEta < 1 and last anomaly was > 24h ago, reset to 1.0.
 */
async function checkAnomaly(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentVoteCount = await Vote.countDocuments({
      userId,
      createdAt: { $gte: tenMinutesAgo },
    });

    if (recentVoteCount > 20) {
      user.anomalyEta = ANOMALY_ETA; // 0.3
      user.lastAnomalyDetected = new Date();
      await user.save();
      return;
    }

    // Reset anomaly eta if it's been more than 24h since last anomaly
    if (user.anomalyEta < 1.0 && user.lastAnomalyDetected) {
      const hoursSince = (Date.now() - user.lastAnomalyDetected.getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 24) {
        user.anomalyEta = 1.0;
        await user.save();
      }
    }
  } catch (e) {
    console.warn('anomaly check failed (non-fatal):', e.message);
  }
}

module.exports = { checkAnomaly };
