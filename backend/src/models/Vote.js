const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'NewsItem', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  direction: { type: Number, enum: [-1, 0, 1], required: true },
  confidence: { type: Number, enum: [0.5, 1.0, 1.5], required: true },
  weight: { type: Number, default: 0 },
  voteHash: { type: String },
  nonce: { type: String },
  voterIpHash: { type: String, default: null },
  onChainTxHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

voteSchema.index({ itemId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
