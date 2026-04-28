const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  walletAddress: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  authMethod: { type: String, enum: ['email', 'wallet'], default: 'email' },
  nonce: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  verificationNote: { type: String, default: '' },
  reputation: { type: Number, default: 25, min: 0, max: 100 },
  is_seed: { type: Boolean, default: false },
  is_reviewer: { type: Boolean, default: false },
  lastValidatedActivity: { type: Date, default: Date.now },
  totalSubmissions: { type: Number, default: 0 },
  correctSubmissions: { type: Number, default: 0 },
  anomalyEta: { type: Number, default: 1.0 },
  lastAnomalyDetected: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
