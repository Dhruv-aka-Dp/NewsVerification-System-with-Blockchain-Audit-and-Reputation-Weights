const express = require('express');
const NewsItem = require('../models/NewsItem');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const { sha256, hexToBytes32 } = require('../utils/hash');
const blockchainService = require('../services/blockchainService');
const { computeEvidenceScore } = require('../services/evidenceService');
const { aggregateItem } = require('../services/aggregationService');
const { MIN_S, MIN_C, MAX_UR } = require('../config/constants');
const { withUserMetrics } = require('../utils/userView');

const router = express.Router();

// Helper to safely parse and validate page numbers
function getPageAndSkip(pageStr, limit = 20) {
  let page = parseInt(pageStr) || 1;
  page = Math.max(1, Math.min(page, 1000)); // Bounds: 1-1000
  const skip = (page - 1) * limit;
  return { page, skip };
}

// POST /api/news — submit a news item (verified users only)
router.post('/', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const { title, description, mediaUrl, mediaType, section } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    // Input validation — prevent excessively long inputs
    if (typeof title !== 'string' || title.length < 5 || title.length > 500) {
      return res.status(400).json({ error: 'title must be 5-500 characters' });
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'description must be under 2000 characters' });
    }
    if (mediaUrl && (typeof mediaUrl !== 'string' || mediaUrl.length > 2048)) {
      return res.status(400).json({ error: 'mediaUrl must be under 2048 characters' });
    }
    if (mediaType && !['text', 'image', 'video', 'audio'].includes(mediaType)) {
      return res.status(400).json({ error: 'invalid mediaType' });
    }
    const validSections = ['National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'];
    if (section && !validSections.includes(section)) {
      return res.status(400).json({ error: 'invalid section' });
    }

    const contentRaw = `${title}${description || ''}${mediaUrl || ''}`;
    const contentHash = sha256(contentRaw);
    const metadataHash = sha256(`${contentHash}${req.user.userId}${Date.now()}`);

    const existing = await NewsItem.findOne({ contentHash });
    if (existing) return res.status(409).json({ error: 'Duplicate content already submitted', item: existing });

    const item = new NewsItem({
      contentHash,
      metadataHash,
      title,
      description: description || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'text',
      section: section || 'JKLU Campus',
      submitterId: req.user.userId,
    });
    await item.save();

    // Blockchain submission logging removed for ERDS demo

    res.status(201).json(item);
  } catch (e) {
    console.error('News route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/news — list items paginated
router.get('/', async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 20);
    const limit = 20;
    const statusFilter = req.query.status;
    const sectionFilter = req.query.section;

    const query = {};
    if (statusFilter) query.status = statusFilter;
    if (sectionFilter) query.section = sectionFilter;
    
    // Text search on title
    const searchQuery = req.query.q;
    if (searchQuery) {
      query.title = { $regex: searchQuery, $options: 'i' };
    }

    const total = await NewsItem.countDocuments(query);
    const items = await NewsItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('submitterId', 'username reputation');

    const itemsWithLiveVotes = await Promise.all(
      items.map(async (item) => {
        const { T, F, U, S } = await aggregateItem(item._id);
        const voteCount = await Vote.countDocuments({ itemId: item._id });
        const plainItem = item.toObject ? item.toObject() : item;
        return { ...plainItem, T, F, U, S, voteCount };
      })
    );

    res.json({ items: itemsWithLiveVotes, total, page, pages: Math.ceil(total / limit), thresholds: { MIN_S, MIN_C, MAX_UR } });
  } catch (e) {
    console.error('News list route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/news/leaderboard — public user leaderboard (for dashboard)
router.get('/leaderboard', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const skip = (page - 1) * limit;
    const query = { email: { $ne: 'admin@newsverify.local' } };
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('username email reputation isVerified is_reviewer is_seed totalSubmissions correctSubmissions createdAt lastValidatedActivity anomalyEta')
      .sort({ reputation: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ users: users.map(withUserMetrics), total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/news/:id — single item
router.get('/:id', async (req, res) => {
  try {
    const item = await NewsItem.findById(req.params.id).populate('submitterId', 'username reputation');
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { T, F, U, S } = await aggregateItem(item._id);
    const voteCount = await Vote.countDocuments({ itemId: item._id });
    const plainItem = item.toObject ? item.toObject() : item;
    res.json({ ...plainItem, T, F, U, S, voteCount, thresholds: { MIN_S, MIN_C, MAX_UR } });
  } catch (e) {
    console.error('News route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/news/:id/evidence — submit evidence URLs
router.post('/:id/evidence', authMiddleware, async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    // Validate URL array
    if (urls.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 URLs allowed' });
    }
    if (!urls.every(u => typeof u === 'string')) {
      return res.status(400).json({ error: 'All URLs must be strings' });
    }

    const item = await NewsItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.status === 'classified') {
      return res.status(400).json({ error: 'Cannot add evidence to a classified item' });
    }

    // Merge new URLs
    const combined = [...new Set([...(item.evidenceUrls || []), ...urls])];
    item.evidenceUrls = combined;
    item.evidenceScore = await computeEvidenceScore(combined);
    await item.save();

    res.json({ evidenceScore: item.evidenceScore, evidenceUrls: item.evidenceUrls });
  } catch (e) {
    console.error('News route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
