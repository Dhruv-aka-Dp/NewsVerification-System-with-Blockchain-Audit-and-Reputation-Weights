const express = require('express');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// GET /api/blockchain/health
router.get('/health', async (req, res) => {
  try { res.json(await blockchainService.getHealth()); }
  catch (e) { res.status(503).json({ connected: false, error: e.message }); }
});

// GET /api/blockchain/stats
router.get('/stats', async (req, res) => {
  try { res.json(await blockchainService.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/submissions
router.get('/submissions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    res.json(await blockchainService.getSubmissions(page, 20));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/votes
router.get('/votes', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    res.json(await blockchainService.getVoteEvents(page, 20));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/decisions
router.get('/decisions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    res.json(await blockchainService.getDecisionEvents(page, 20));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/snapshots
router.get('/snapshots', async (req, res) => {
  try { res.json(await blockchainService.getSnapshotEvents()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
