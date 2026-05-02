const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Vote = require('../models/Vote');
const NewsItem = require('../models/NewsItem');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimit');
const { checkAnomaly } = require('../middleware/anomaly');
const { computeWeight } = require('../services/weightService');
const { evaluateItem } = require('../services/decisionService');
const { broadcastVoteUpdate } = require('../services/socketService');
const { touchUserActivity } = require('../services/reputationService');
const { canUserVote } = require('../services/reputationMath');
const { withUserMetrics } = require('../utils/userView');
const { sha256 } = require('../utils/hash');
const User = require('../models/User');

const router = express.Router();

const VALID_DIRECTIONS = [-1, 0, 1];
const VALID_CONFIDENCES = [0.5, 1.0, 1.5];

// POST /api/votes — cast a vote (verified users only)
router.post('/', authMiddleware, verifiedOnly, voteLimiter, async (req, res) => {
  try {
    const { itemId, direction, confidence } = req.body;

    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    if (!VALID_DIRECTIONS.includes(Number(direction))) {
      return res.status(400).json({ error: 'direction must be -1, 0, or 1' });
    }
    if (!VALID_CONFIDENCES.includes(Number(confidence))) {
      return res.status(400).json({ error: 'confidence must be 0.5, 1.0, or 1.5' });
    }

    const item = await NewsItem.findById(itemId);
    if (!item) return res.status(404).json({ error: 'NewsItem not found' });
    if (item.status === 'classified') {
      return res.status(400).json({ error: 'Item is already classified; voting is closed' });
    }

    // One vote per user per item (DB unique index enforces this too)
    const existing = await Vote.findOne({ itemId, userId: req.user.userId });
    if (existing) return res.status(409).json({ error: 'You have already voted on this item' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!canUserVote(user)) {
      return res.status(403).json({ error: 'Voting rights suspended: effective reputation below 10' });
    }

    const dir = Number(direction);
    const conf = Number(confidence);

    const w = computeWeight(user, conf);
    const nonce = uuidv4();
    const voteHash = sha256(`${req.user.userId}${itemId}${dir}${conf}${nonce}`);

    // Hash the IP for privacy
    const rawIp = req.ip || req.connection.remoteAddress || '';
    const voterIpHash = sha256(rawIp);

    const vote = new Vote({
      itemId,
      userId: req.user.userId,
      direction: dir,
      confidence: conf,
      weight: w,
      voteHash,
      nonce,
      voterIpHash,
    });
    await vote.save();

    // Increment vote count on news item
    await NewsItem.findByIdAndUpdate(itemId, { $inc: { voteCount: 1 } });

    // Blockchain vote logging removed for ERDS demo

    // Check anomaly after vote is saved
    await checkAnomaly(req.user.userId);

    // Re-evaluate item on every vote
    const updatedItem = await evaluateItem(itemId);

    if (updatedItem.status !== 'classified') {
      const refreshedUser = await User.findById(req.user.userId);
      if (refreshedUser) {
        await touchUserActivity(refreshedUser, {
          reason: 'vote-activity-refresh',
          source: 'vote',
          itemId,
          direction: dir,
          confidenceLevel: conf,
          newLastValidatedActivity: new Date(),
        });
      }
    }

    // Broadcast vote update to all connected clients
    await broadcastVoteUpdate(itemId);

    const currentUser = await User.findById(req.user.userId).select('-passwordHash -nonce');
    res.status(201).json({
      vote,
      item: updatedItem,
      currentUser: currentUser ? withUserMetrics(currentUser) : null,
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'You have already voted on this item' });
    }
    res.status(500).json({ error: e.message });
  }
});

// GET /api/votes/:itemId — get all votes (public)
router.get('/:itemId', async (req, res) => {
  try {
    const votes = await Vote.find({ itemId: req.params.itemId })
      .populate('userId', 'username is_seed')
      .sort({ createdAt: -1 });
    // Map to safe response format
    const safe = votes.map(v => ({
      direction: v.direction,
      confidence: v.confidence,
      weight: v.weight,
      username: v.userId?.username || '—',
      createdAt: v.createdAt,
    }));
    res.json({ votes: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
