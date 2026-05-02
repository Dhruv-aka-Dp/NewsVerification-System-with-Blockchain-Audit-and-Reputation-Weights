const User = require('../models/User');
const ReputationSnapshot = require('../models/ReputationSnapshot');
const blockchainService = require('./blockchainService');
const { sha256, hexToBytes32 } = require('../utils/hash');

// 24 hours interval
const INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runReputationSnapshot() {
  try {
    console.log('[Cron] Starting reputation snapshot process...');
    
    // Fetch all users and sort to ensure deterministic ordering
    const users = await User.find({}, { username: 1, reputation: 1 }).sort({ _id: 1 });
    
    // Build a deterministic string of user reputations
    let stateString = '';
    for (const u of users) {
      stateString += `${u._id}:${u.reputation}|`;
    }
    
    const stateHash = sha256(stateString);
    
    const lastSnapshot = await ReputationSnapshot.findOne().sort({ epochNumber: -1 });
    const nextEpoch = lastSnapshot ? lastSnapshot.epochNumber + 1 : 1;
    
    const snapshot = new ReputationSnapshot({
      epochNumber: nextEpoch,
      stateHash,
      totalUsers: users.length
    });
    
    await snapshot.save();
    console.log(`[Cron] Database snapshot saved for epoch ${nextEpoch}`);

    // Blockchain commit removed: ERDS uses event-based logging directly in reputationService
  } catch (error) {
    console.error('[Cron] Reputation snapshot failed:', error.message);
  }
}

function initCron() {
  console.log(`[Cron] Initialized with interval ${INTERVAL_MS}ms`);
  setInterval(runReputationSnapshot, INTERVAL_MS);
}

module.exports = { initCron, runReputationSnapshot };
