const { LAMBDA_DECAY, VOTING_REPUTATION_THRESHOLD } = require('../config/constants');
const { clamp } = require('../utils/math');

function getElapsedHours(lastValidatedActivity, at = new Date()) {
  const last = lastValidatedActivity ? new Date(lastValidatedActivity) : new Date(at);
  return Math.max(0, (new Date(at).getTime() - last.getTime()) / (1000 * 60 * 60));
}

function getDecayFactor(user, at = new Date()) {
  return Math.exp(-LAMBDA_DECAY * getElapsedHours(user?.lastValidatedActivity, at));
}

function computeEffectiveReputation(user, at = new Date()) {
  const baseReputation = typeof user?.reputation === 'number' ? user.reputation : 0;
  return clamp(baseReputation * getDecayFactor(user, at), 0, 100);
}

function canUserVote(user, at = new Date()) {
  return computeEffectiveReputation(user, at) >= VOTING_REPUTATION_THRESHOLD;
}

module.exports = {
  getElapsedHours,
  getDecayFactor,
  computeEffectiveReputation,
  canUserVote,
};
