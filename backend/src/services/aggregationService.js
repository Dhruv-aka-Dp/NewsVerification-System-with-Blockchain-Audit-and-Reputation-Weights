const Vote = require('../models/Vote');
const User = require('../models/User');
const { computeWeight } = require('./weightService');
const { applyClusterPenalties } = require('./clusterService');
const { MAX_WEIGHT_FRACTION, GLOBAL_TOP_WEIGHT_FRACTION, SEED_WEIGHT_CAP } = require('../config/constants');

/**
 * Aggregate all votes for a news item and return signal metrics.
 *
 * @param {string} itemId
 * @returns {{ T, F, U, S, P, U_r, C, voteCount }}
 */
async function aggregateItem(itemId) {
  const votes = await Vote.find({ itemId }).populate('userId').lean();

  if (votes.length === 0) {
    return { T: 0, F: 0, U: 0, S: 0, P: 0, U_r: 1, C: 0, voteCount: 0 };
  }

  // Step 1: compute raw weights
  const weightMap = {};
  for (const vote of votes) {
    const user = vote.userId;
    if (!user) continue;
    const w = computeWeight(user, vote.confidence);
    weightMap[vote._id.toString()] = w;
  }

  // Step 2: per-user cap (5% of total)
  let totalW = Object.values(weightMap).reduce((a, b) => a + b, 0);
  const maxPerUser = MAX_WEIGHT_FRACTION * totalW;
  for (const id of Object.keys(weightMap)) {
    if (weightMap[id] > maxPerUser) weightMap[id] = maxPerUser;
  }
  // Recompute after cap
  totalW = Object.values(weightMap).reduce((a, b) => a + b, 0);

  // Step 3: cluster penalties
  const votesWithIds = await Vote.find({ itemId }).populate('userId');
  const adjustedWeightMap = await applyClusterPenalties(votesWithIds, { ...weightMap });
  Object.assign(weightMap, adjustedWeightMap);
  totalW = Object.values(weightMap).reduce((a, b) => a + b, 0);

  // Step 4: global top-user cap (top users combined ≤ 25% of total)
  const sortedEntries = Object.entries(weightMap).sort((a, b) => b[1] - a[1]);
  const globalCap = GLOBAL_TOP_WEIGHT_FRACTION * totalW;
  let cumulativeTop = 0;
  for (const [id, w] of sortedEntries) {
    cumulativeTop += w;
    if (cumulativeTop > globalCap) {
      // Scale this weight down so cumulative stays at cap
      const excess = cumulativeTop - globalCap;
      weightMap[id] = Math.max(0, w - excess);
      break;
    }
  }
  totalW = Object.values(weightMap).reduce((a, b) => a + b, 0);

  // Step 5: seed cap (Σw_seed ≤ 40% of Σw_all)
  const seedVoteIds = [];
  const nonSeedVoteIds = [];
  for (const vote of votes) {
    const user = vote.userId;
    if (user && user.is_seed) {
      seedVoteIds.push(vote._id.toString());
    } else {
      nonSeedVoteIds.push(vote._id.toString());
    }
  }

  let seedW = seedVoteIds.reduce((acc, id) => acc + (weightMap[id] || 0), 0);
  const maxSeedW = SEED_WEIGHT_CAP * totalW;
  if (seedW > maxSeedW && seedW > 0) {
    const scaleFactor = maxSeedW / seedW;
    for (const id of seedVoteIds) {
      if (weightMap[id] !== undefined) weightMap[id] *= scaleFactor;
    }
  }

  // Step 6: compute T, F, U, S
  let T = 0, F = 0, U = 0;
  for (const vote of votes) {
    const w = weightMap[vote._id.toString()] || 0;
    if (vote.direction === 1) T += w;
    else if (vote.direction === -1) F += w;
    else U += w;
  }

  const S = T + F + U;
  const EPSILON = 1e-10; // Prevent division by zero (doc §7.2)
  const P = (T - F) / (T + F + EPSILON);
  const U_r = S > 0 ? U / S : 1;
  const C = (1 - U_r) * Math.abs(T - F) / (T + F + EPSILON);

  return { T, F, U, S, P, U_r, C, voteCount: votes.length };
}

/**
 * Credibility score formula.
 * Cred = (0.4*P + 0.3*C + 0.2*E + 0.1*S_r) * (1 - U_r)
 */
function computeCredibility(P, C, E, S_r, U_r) {
  let cred = 0.4 * P + 0.3 * C + 0.2 * E + 0.1 * S_r;
  cred = cred * (1 - U_r);
  return cred;
}

module.exports = { aggregateItem, computeCredibility };
