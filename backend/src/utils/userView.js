const { canUserVote, computeEffectiveReputation } = require('../services/reputationMath');

function withUserMetrics(user) {
  const plain = user?.toObject ? user.toObject() : { ...user };
  const effectiveReputation = Number(computeEffectiveReputation(plain).toFixed(2));

  return {
    ...plain,
    effectiveReputation,
    canVote: canUserVote(plain),
  };
}

module.exports = { withUserMetrics };
