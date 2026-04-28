const mongoose = require('mongoose');

const newsItemSchema = new mongoose.Schema({
  contentHash: { type: String, required: true, unique: true },
  metadataHash: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  section: { type: String, enum: ['National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'], default: 'JKLU Campus' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
  submitterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'pending_review', 'classified', 'appealed'],
    default: 'pending',
  },
  classification: {
    type: String,
    enum: ['Verified True', 'Likely True', 'Uncertain', 'Likely False', 'False', null],
    default: null,
  },
  credibilityScore: { type: Number, default: null },
  polarity: { type: Number, default: null },
  confidence: { type: Number, default: null },
  uncertaintyRatio: { type: Number, default: null },
  voteCount: { type: Number, default: 0 },
  T: { type: Number, default: 0 },
  F: { type: Number, default: 0 },
  U: { type: Number, default: 0 },
  S: { type: Number, default: 0 },
  evidenceScore: { type: Number, default: 0 },
  evidenceUrls: [{ type: String }],
  onChainTxHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  finalizedAt: { type: Date, default: null },
});

module.exports = mongoose.model('NewsItem', newsItemSchema);
