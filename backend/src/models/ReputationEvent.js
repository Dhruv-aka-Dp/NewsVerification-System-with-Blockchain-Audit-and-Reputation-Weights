const mongoose = require('mongoose');

const reputationEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  reason: { type: String, required: true },
  source: { type: String, default: 'system' },
  oldBaseReputation: { type: Number, required: true },
  newBaseReputation: { type: Number, required: true },
  oldEffectiveReputation: { type: Number, required: true },
  newEffectiveReputation: { type: Number, required: true },
  deltaBaseReputation: { type: Number, required: true },
  deltaEffectiveReputation: { type: Number, required: true },
  lastActivityBefore: { type: Date, default: null },
  lastActivityAfter: { type: Date, default: null },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'NewsItem', default: null },
  classification: { type: String, default: '' },
  direction: { type: Number, default: null },
  confidenceLevel: { type: Number, default: null },
  txHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

reputationEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ReputationEvent', reputationEventSchema);
