const Vote = require('../models/Vote');
const User = require('../models/User');
const { clamp } = require('../utils/math');
const { ALPHA, BETA, GAMMA } = require('../config/constants');

/**
 * Determine if a vote was correct given the final classification.
 * Returns 'correct', 'wrong', or 'uncertain'.
 */
function voteOutcome(direction, classification) {
  const isTrue = classification === 'Verified True' || classification === 'Likely True';
  const isFalse = classification === 'False' || classification === 'Likely False';

  if (direction === 1 && isTrue) return 'correct';
  if (direction === -1 && isFalse) return 'correct';
  if (direction === 0) return 'uncertain';
  return 'wrong';
}

/**
 * Compute ΔR for a vote.
 * correct:   +ALPHA * c_i
 * wrong:     -BETA  * c_i
 * uncertain: +GAMMA * (1 - U_r)
 * Clamped to [-3, +3]
 */
function computeDeltaR(outcome, confidence, U_r) {
  let delta;
  if (outcome === 'correct') {
    delta = ALPHA * confidence;
  } else if (outcome === 'wrong') {
    delta = -BETA * confidence;
  } else {
    delta = GAMMA * (1 - U_r);
  }
  return clamp(delta, -3, 3);
}

/**
 * Update reputation for all voters on an item after classification.
 */
async function updateAllVoters(itemId, finalClassification, U_r) {
  const votes = await Vote.find({ itemId }).populate('userId');

  for (const vote of votes) {
    const user = vote.userId;
    if (!user) continue;

    const outcome = voteOutcome(vote.direction, finalClassification);
    const deltaR = computeDeltaR(outcome, vote.confidence, U_r || 0);
    const newReputation = clamp(user.reputation + deltaR, 0, 100);

    await User.findByIdAndUpdate(user._id, {
      reputation: newReputation,
      lastValidatedActivity: new Date(),
    });
  }
}

module.exports = { updateAllVoters, voteOutcome, computeDeltaR };
