const mongoose = require('mongoose');

const reputationSnapshotSchema = new mongoose.Schema({
  epochNumber: { type: Number, required: true, unique: true },
  stateHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  onChainTxHash: { type: String },
  totalUsers: { type: Number, required: true },
});

module.exports = mongoose.model('ReputationSnapshot', reputationSnapshotSchema);
