const Vote = require('../models/Vote');
const { pearsonCorrelation } = require('../utils/math');

/**
 * Apply cluster penalties to a weight map.
 *
 * Clustering criteria:
 *  1. Same hashed IP block (first 3 octets of IPv4 or /48 of IPv6, hashed)
 *  2. Pairwise vote-direction correlation > 0.9 across last 20 items
 *
 * Penalty: w_cluster = Σw_i / (1 + 0.1 * (n - 1))
 * Each cluster member's weight is scaled proportionally.
 *
 * @param {Array} votes - array of Vote documents (populated with userId)
 * @param {Object} weightMap - { voteId: weight }
 * @returns {Object} updated weightMap
 */
async function applyClusterPenalties(votes, weightMap) {
  if (votes.length === 0) return weightMap;

  // Build user → vote index map
  const userVoteMap = {};
  for (const v of votes) {
    userVoteMap[v.userId.toString()] = v;
  }

  const userIds = Object.keys(userVoteMap);

  // --- IP-based clustering ---
  const ipGroups = {};
  for (const v of votes) {
    if (!v.voterIpHash) continue;
    const key = v.voterIpHash;
    if (!ipGroups[key]) ipGroups[key] = [];
    ipGroups[key].push(v);
  }

  // --- Pattern-based clustering (correlation over last 20 items) ---
  // Fetch last 20 item-level vote directions for each user pair
  const patternClusters = await buildPatternClusters(votes);

  // Merge IP clusters and pattern clusters into unified cluster sets
  const clusterSets = mergeClusterSets([
    ...Object.values(ipGroups).filter(g => g.length > 1),
    ...patternClusters,
  ]);

  // Apply penalty for each cluster
  for (const cluster of clusterSets) {
    if (cluster.length <= 1) continue;
    const n = cluster.length;

    const clusterVoteIds = cluster.map(v => v._id.toString());
    const sumW = clusterVoteIds.reduce((acc, id) => acc + (weightMap[id] || 0), 0);
    const penalizedSum = sumW / (1 + 0.1 * (n - 1));
    const scaleFactor = sumW > 0 ? penalizedSum / sumW : 1;

    for (const id of clusterVoteIds) {
      if (weightMap[id] !== undefined) {
        weightMap[id] *= scaleFactor;
      }
    }
  }

  return weightMap;
}

/**
 * Build pattern-based clusters by computing pairwise correlation
 * of vote directions over the last 20 items.
 */
async function buildPatternClusters(currentVotes) {
  const userIds = currentVotes.map(v => v.userId.toString());
  if (userIds.length < 2) return [];

  // For each user, get their last 20 votes across any items
  const userHistories = {};
  for (const uid of userIds) {
    const recentVotes = await Vote.find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    userHistories[uid] = recentVotes.map(v => ({ itemId: v.itemId.toString(), direction: v.direction }));
  }

  // Find common items and compute correlation for each pair
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const uid1 = userIds[i];
      const uid2 = userIds[j];
      const pairKey = [uid1, uid2].sort().join(':');
      if (visited.has(pairKey)) continue;
      visited.add(pairKey);

      const hist1 = userHistories[uid1];
      const hist2 = userHistories[uid2];

      // Skip if either user has no vote history
      if (!hist1 || !hist2 || hist1.length === 0 || hist2.length === 0) continue;

      // Find common item IDs
      const items1 = new Map(hist1.map(h => [h.itemId, h.direction]));
      const commonItems = hist2.filter(h => items1.has(h.itemId));
      if (commonItems.length < 5) continue; // need at least 5 common votes

      const xs = commonItems.map(h => items1.get(h.itemId));
      const ys = commonItems.map(h => h.direction);

      const corr = pearsonCorrelation(xs, ys);
      if (corr > 0.9) {
        const v1 = currentVotes.find(v => v.userId.toString() === uid1);
        const v2 = currentVotes.find(v => v.userId.toString() === uid2);
        if (v1 && v2) clusters.push([v1, v2]);
      }
    }
  }

  return clusters;
}

/**
 * Merge overlapping clusters into unified sets (union-find style).
 */
function mergeClusterSets(rawClusters) {
  const parent = new Map();

  function find(v) {
    const id = v._id.toString();
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, find({ _id: parent.get(id) }));
    return parent.get(id);
  }

  // We need actual vote objects for find to work correctly
  // Rebuild with a flat list
  const allVotes = new Map();
  for (const cluster of rawClusters) {
    for (const v of cluster) allVotes.set(v._id.toString(), v);
  }

  function findById(id) {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, findById(parent.get(id)));
    return parent.get(id);
  }

  function union(id1, id2) {
    const r1 = findById(id1);
    const r2 = findById(id2);
    if (r1 !== r2) parent.set(r1, r2);
  }

  for (const cluster of rawClusters) {
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        union(cluster[i]._id.toString(), cluster[j]._id.toString());
      }
    }
  }

  // Group by root
  const groups = new Map();
  for (const [id, vote] of allVotes) {
    const root = findById(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(vote);
  }

  return Array.from(groups.values()).filter(g => g.length > 1);
}

module.exports = { applyClusterPenalties };
