const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'NewsItem', required: true },
  classification: { type: String, required: true },
  credibilityScore: { type: Number },
  polarity: { type: Number },
  confidence: { type: Number },
  uncertaintyRatio: { type: Number },
  T: { type: Number },
  F: { type: Number },
  U: { type: Number },
  S: { type: Number },
  decisionProofHash: { type: String },
  onChainTxHash: { type: String },
  decidedBy: { type: String, enum: ['system', 'reviewer'], default: 'system' },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Decision', decisionSchema);
