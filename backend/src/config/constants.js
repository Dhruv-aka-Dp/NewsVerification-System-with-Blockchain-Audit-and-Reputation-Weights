require('dotenv').config();

module.exports = {
  LAMBDA_DECAY: parseFloat(process.env.LAMBDA_DECAY) || 0.005,
  MIN_S: parseFloat(process.env.MIN_S) || 5,
  MIN_C: parseFloat(process.env.MIN_C) || 0.3,
  MAX_UR: parseFloat(process.env.MAX_UR) || 0.6,
  ALPHA: parseFloat(process.env.ALPHA) || 1.5,
  BETA: parseFloat(process.env.BETA) || 1.5,
  GAMMA: parseFloat(process.env.GAMMA) || 0.5,
  MAX_WEIGHT_FRACTION: 0.05,
  GLOBAL_TOP_WEIGHT_FRACTION: 0.25,
  SEED_WEIGHT_CAP: 0.40,
  CLUSTER_DELTA: 0.10,
  VOTE_RATE_LIMIT_PER_HOUR: 50,
  ANOMALY_ETA: 0.3,
  STARTING_REPUTATION_PUBLIC: 25,
  STARTING_REPUTATION_SEED: 60,
};
