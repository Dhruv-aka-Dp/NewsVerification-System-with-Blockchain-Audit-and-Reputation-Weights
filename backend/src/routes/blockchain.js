const express = require('express');
const ReputationEvent = require('../models/ReputationEvent');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// GET /api/blockchain/health
router.get('/health', async (req, res) => {
  try { res.json(await blockchainService.getHealth()); }
  catch (e) { res.status(503).json({ connected: false, error: e.message }); }
});

// GET /api/blockchain/stats
router.get('/stats', async (req, res) => {
  try {
    const [chainStats, totalTrackedUpdates, latestUpdate] = await Promise.all([
      blockchainService.getStats(),
      ReputationEvent.countDocuments(),
      ReputationEvent.findOne().sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      ...chainStats,
      totalTrackedUpdates,
      latestTrackedUpdateAt: latestUpdate?.createdAt || null,
    });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/reputation-updates
router.get('/reputation-updates', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [events, total, chainStats] = await Promise.all([
      ReputationEvent.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReputationEvent.countDocuments(),
      blockchainService.getStats(),
    ]);

    const summary = events.reduce((acc, event) => {
      if (event.reason.includes('reward')) acc.rewards += 1;
      else if (event.reason.includes('penalty')) acc.penalties += 1;
      else if (event.reason.includes('decay')) acc.decayAdjustments += 1;
      else if (event.reason.includes('seed')) acc.initializations += 1;
      else acc.activityRefreshes += 1;
      return acc;
    }, {
      rewards: 0,
      penalties: 0,
      decayAdjustments: 0,
      initializations: 0,
      activityRefreshes: 0,
    });

    res.json({
      items: events,
      total,
      page,
      pages: Math.ceil(total / limit),
      chainTotal: chainStats.totalReputationUpdates || 0,
      summary,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
