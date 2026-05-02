const express = require('express');
const bcrypt = require('bcryptjs');
const NewsItem = require('../models/NewsItem');
const User = require('../models/User');
const { authMiddleware, reviewerOnly } = require('../middleware/auth');
const { manualClassify } = require('../services/decisionService');
const { seedDemoDataset } = require('../services/demoSeedService');
const { STARTING_REPUTATION_SEED, STARTING_REPUTATION_PUBLIC } = require('../config/constants');
const { withUserMetrics } = require('../utils/userView');

const router = express.Router();

// Helper to safely parse and validate page numbers
function getPageAndSkip(pageStr, limit = 20) {
  let page = parseInt(pageStr) || 1;
  page = Math.max(1, Math.min(page, 1000)); // Bounds: 1-1000
  const skip = (page - 1) * limit;
  return { page, skip };
}

// GET /api/admin/queue — items awaiting review
router.get('/queue', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 20);
    const limit = 20;
    const total = await NewsItem.countDocuments({ status: 'pending_review' });
    const items = await NewsItem.find({ status: 'pending_review' })
      .sort({ createdAt: 'asc' })
      .skip(skip)
      .limit(limit)
      .populate('submitterId', 'username reputation');
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/classify/:itemId — manual classification
router.post('/classify/:itemId', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { classification } = req.body;
    const validLabels = ['Verified True', 'Likely True', 'Uncertain', 'Likely False', 'False'];
    if (!validLabels.includes(classification)) {
      return res.status(400).json({ error: 'Invalid classification label' });
    }
    const item = await manualClassify(req.params.itemId, classification, req.user.userId);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/users — list users with stats
router.get('/users', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 30);
    const limit = 30;
    const total = await User.countDocuments();
    const users = await User.find()
      .select('-passwordHash -nonce')
      .sort({ reputation: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ users: users.map(withUserMetrics), total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/pending-users — list unverified users
router.get('/pending-users', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const users = await User.find({ isVerified: false })
      .select('-passwordHash -nonce')
      .sort({ createdAt: -1 });
    res.json({ users: users.map(withUserMetrics) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/verify-user/:userId — approve a pending user
router.post('/verify-user/:userId', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { note } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });

    user.isVerified = true;
    user.verificationNote = note || `Verified by reviewer on ${new Date().toISOString()}`;
    await user.save();

    res.json({ message: 'User verified successfully', user: { id: user._id, username: user.username, isVerified: true } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/reject-user/:userId — reject a pending user
router.post('/reject-user/:userId', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationNote = `Rejected: ${reason || 'No reason provided'}`;
    await user.save();

    res.json({ message: 'User rejection noted', user: { id: user._id, username: user.username } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/add-user — manually add a verified user
router.post('/add-user', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const { username, email, walletAddress, password, is_reviewer, is_seed } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    if (!email && !walletAddress) return res.status(400).json({ error: 'email or walletAddress required' });

    const query = [{ username }];
    if (email) query.push({ email });
    if (walletAddress) query.push({ walletAddress: walletAddress.toLowerCase() });

    const existing = await User.findOne({ $or: query });
    if (existing) return res.status(409).json({ error: 'Username, email, or wallet already taken' });

    const userData = {
      username,
      authMethod: walletAddress ? 'wallet' : 'email',
      reputation: is_seed ? STARTING_REPUTATION_SEED : STARTING_REPUTATION_PUBLIC,
      is_seed: !!is_seed,
      is_reviewer: !!is_reviewer,
      isVerified: true,
    };

    if (email) userData.email = email;
    if (walletAddress) userData.walletAddress = walletAddress.toLowerCase();
    if (password) userData.passwordHash = await bcrypt.hash(password, 12);

    const user = new User(userData);
    await user.save();
    res.status(201).json({ id: user._id, username, isVerified: true, is_reviewer: !!is_reviewer, is_seed: !!is_seed });
  } catch (e) {
    console.error('Add user error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/seed — create a seed reviewer (requires seed access)
router.post('/seed', authMiddleware, async (req, res) => {
  try {
    // Only seed reviewers can create new seed accounts (not regular reviewers)
    if (!req.user.is_seed || !req.user.is_reviewer) {
      return res.status(403).json({ error: 'Seed reviewer access required' });
    }
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(409).json({ error: 'Username or email already taken' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      passwordHash,
      authMethod: 'email',
      reputation: STARTING_REPUTATION_SEED,
      is_seed: true,
      is_reviewer: true,
      isVerified: true,
    });
    await user.save();
    res.status(201).json({ id: user._id, username, email, reputation: user.reputation });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/seed-demo — seed 50 ERDS demo items (reviewer only)
router.post('/seed-demo', authMiddleware, reviewerOnly, async (req, res) => {
  try {
    const result = await seedDemoDataset({ forceReset: true });
    res.json({
      success: true,
      ...result,
      message: `Demo dataset reset to ${result.items} items with ${result.reputationEvents} tracked reputation updates.`,
    });
  } catch (e) {
    console.error('seed-demo error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
