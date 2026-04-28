const express = require('express');
const Decision = require('../models/Decision');

const router = express.Router();

// Helper to safely parse and validate page numbers
function getPageAndSkip(pageStr, limit = 20) {
  let page = parseInt(pageStr) || 1;
  page = Math.max(1, Math.min(page, 1000)); // Bounds: 1-1000
  const skip = (page - 1) * limit;
  return { page, skip };
}

// GET /api/decisions/:itemId — get decision for a specific item
router.get('/:itemId', async (req, res) => {
  try {
    const decision = await Decision.findOne({ itemId: req.params.itemId })
      .populate('reviewerId', 'username')
      .sort({ createdAt: -1 });
    if (!decision) return res.status(404).json({ error: 'No decision found for this item' });
    res.json(decision);
  } catch (e) {
    console.error('Decisions route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/decisions — list all decisions paginated
router.get('/', async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 20);
    const limit = 20;
    const total = await Decision.countDocuments();
    const decisions = await Decision.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('itemId', 'title status')
      .populate('reviewerId', 'username');
    res.json({ decisions, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
