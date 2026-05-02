const Vote = require('../models/Vote');
const ReputationEvent = require('../models/ReputationEvent');
const { clamp } = require('../utils/math');
const { ALPHA, BETA, GAMMA } = require('../config/constants');
const blockchainService = require('./blockchainService');
const { sha256, hexToBytes32 } = require('../utils/hash');
const { computeEffectiveReputation } = require('./reputationMath');

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

async function recordReputationEvent({
  user,
  reason,
  source = 'system',
  itemId = null,
  classification = '',
  direction = null,
  confidenceLevel = null,
  eventTime = new Date(),
  newReputation = null,
  newLastValidatedActivity = null,
  persistUser = true,
  oldBaseReputationOverride = null,
  oldLastActivityOverride = null,
}) {
  if (!user) return null;

  const actionTime = new Date(eventTime);
  const oldBaseReputation = typeof oldBaseReputationOverride === 'number'
    ? oldBaseReputationOverride
    : Number(user.reputation || 0);
  const oldLastActivity = oldLastActivityOverride
    ? new Date(oldLastActivityOverride)
    : (user.lastValidatedActivity ? new Date(user.lastValidatedActivity) : actionTime);

  const nextBaseReputation = clamp(
    typeof newReputation === 'number' ? newReputation : oldBaseReputation,
    0,
    100
  );
  const nextLastActivity = newLastValidatedActivity
    ? new Date(newLastValidatedActivity)
    : oldLastActivity;

  const oldEffectiveReputation = Number(
    computeEffectiveReputation(
      { reputation: oldBaseReputation, lastValidatedActivity: oldLastActivity },
      actionTime
    ).toFixed(2)
  );
  const newEffectiveReputation = Number(
    computeEffectiveReputation(
      { reputation: nextBaseReputation, lastValidatedActivity: nextLastActivity },
      actionTime
    ).toFixed(2)
  );
  const deltaBaseReputation = Number((nextBaseReputation - oldBaseReputation).toFixed(2));
  const deltaEffectiveReputation = Number((newEffectiveReputation - oldEffectiveReputation).toFixed(2));

  if (persistUser) {
    user.reputation = nextBaseReputation;
    user.lastValidatedActivity = nextLastActivity;
    await user.save();
  }

  const initialHash = sha256(`${user._id}:${oldEffectiveReputation.toFixed(2)}`);
  const changeHash = sha256(
    `${reason}:${deltaBaseReputation.toFixed(2)}:${deltaEffectiveReputation.toFixed(2)}:${actionTime.toISOString()}`
  );
  const finalHash = sha256(`${user._id}:${newEffectiveReputation.toFixed(2)}`);
  const userIdHash = sha256(`${user._id}`);

  let txHash = null;
  try {
    txHash = await blockchainService.logReputationUpdate(
      hexToBytes32(userIdHash),
      hexToBytes32(initialHash),
      hexToBytes32(changeHash),
      hexToBytes32(finalHash)
    );
  } catch (e) {
    console.warn('Failed to log reputation to blockchain:', e.message);
  }

  await ReputationEvent.create({
    userId: user._id,
    username: user.username,
    reason,
    source,
    oldBaseReputation,
    newBaseReputation: nextBaseReputation,
    oldEffectiveReputation,
    newEffectiveReputation,
    deltaBaseReputation,
    deltaEffectiveReputation,
    lastActivityBefore: oldLastActivity,
    lastActivityAfter: nextLastActivity,
    itemId,
    classification,
    direction,
    confidenceLevel,
    txHash,
    createdAt: actionTime,
  });

  return {
    txHash,
    oldEffectiveReputation,
    newEffectiveReputation,
    deltaBaseReputation,
    deltaEffectiveReputation,
  };
}

async function touchUserActivity(user, details = {}) {
  return recordReputationEvent({
    user,
    reason: details.reason || 'activity-refresh',
    source: details.source || 'interaction',
    itemId: details.itemId || null,
    classification: details.classification || '',
    direction: details.direction ?? null,
    confidenceLevel: details.confidenceLevel ?? null,
    eventTime: details.eventTime || new Date(),
    newReputation: user.reputation,
    newLastValidatedActivity: details.newLastValidatedActivity || new Date(),
  });
}

async function seedInitialReputationEvent(user, details = {}) {
  return recordReputationEvent({
    user,
    reason: details.reason || 'seed-initialization',
    source: details.source || 'seed',
    eventTime: details.eventTime || new Date(),
    newReputation: user.reputation,
    newLastValidatedActivity: user.lastValidatedActivity || new Date(),
    persistUser: false,
    oldBaseReputationOverride: 0,
    oldLastActivityOverride: user.createdAt || new Date(),
  });
}

/**
 * Update reputation for all voters on an item after classification.
 */
async function updateAllVoters(itemId, finalClassification, U_r) {
  const votes = await Vote.find({ itemId }).populate('userId');
  const actionTime = new Date();

  for (const vote of votes) {
    const user = vote.userId;
    if (!user) continue;

    const outcome = voteOutcome(vote.direction, finalClassification);
    const deltaR = computeDeltaR(outcome, vote.confidence, U_r || 0);
    const newReputation = clamp(user.reputation + deltaR, 0, 100);
    const reason = outcome === 'correct'
      ? 'classification-reward'
      : outcome === 'wrong'
        ? 'classification-penalty'
        : 'classification-uncertain';

    await recordReputationEvent({
      user,
      reason,
      source: 'classification',
      itemId,
      classification: finalClassification,
      direction: vote.direction,
      confidenceLevel: vote.confidence,
      eventTime: actionTime,
      newReputation,
      newLastValidatedActivity: actionTime,
    });
  }
}

module.exports = {
  updateAllVoters,
  voteOutcome,
  computeDeltaR,
  recordReputationEvent,
  touchUserActivity,
  seedInitialReputationEvent,
};
