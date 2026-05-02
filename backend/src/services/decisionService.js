const NewsItem = require('../models/NewsItem');
const Decision = require('../models/Decision');
const User = require('../models/User');
const { aggregateItem, computeCredibility } = require('./aggregationService');
const { MIN_C, MIN_S, MAX_UR } = require('../config/constants');
const { sha256, hexToBytes32 } = require('../utils/hash');
const blockchainService = require('./blockchainService');
const reputationService = require('./reputationService');

/**
 * Map polarity to classification label.
 */
function classifyFromP(P) {
  if (P >= 0.6) return 'Verified True';
  if (P >= 0.2) return 'Likely True';
  if (P > -0.2) return 'Uncertain';
  if (P > -0.6) return 'Likely False';
  return 'False';
}

/**
 * Evaluate an item after a new vote. Applies decision rule.
 * If rule passes, classifies and finalizes; otherwise sets pending_review.
 */
async function evaluateItem(itemId) {
  const { T, F, U, S, P, U_r, C } = await aggregateItem(itemId);

  const item = await NewsItem.findById(itemId).populate('submitterId');
  if (!item) throw new Error('NewsItem not found');

  const submitter = item.submitterId;
  const S_r = submitter
    ? submitter.correctSubmissions / (submitter.totalSubmissions || 1)
    : 0;
  const E = item.evidenceScore || 0;

  const Cred = computeCredibility(P, C, E, S_r, U_r);

  // Update running signal stats on item
  item.T = T;
  item.F = F;
  item.U = U;
  item.S = S;
  item.polarity = P;
  item.confidence = C;
  item.uncertaintyRatio = U_r;
  item.credibilityScore = Cred;

  // Safety check: prevent classification with zero votes
  if (S === 0) {
    item.status = 'pending';
    await item.save();
    return item;
  }

  const rulePass = C >= MIN_C && U_r <= MAX_UR && S >= MIN_S;

  if (rulePass) {
    const label = classifyFromP(P);
    item.classification = label;
    item.status = 'classified';
    item.finalizedAt = new Date();

    // Build proof hash: D_h = hash(H ‖ L ‖ T ‖ F ‖ U ‖ C ‖ P)
    const proofString = `${item.contentHash}:${label}:${T}:${F}:${U}:${C}:${P}`;
    const proofHash = sha256(proofString);

    // Blockchain decision logging removed for ERDS demo
    await item.save();

    // Save Decision record
    const decision = new Decision({
      itemId,
      classification: label,
      credibilityScore: Cred,
      polarity: P,
      confidence: C,
      uncertaintyRatio: U_r,
      T,
      F,
      U,
      S,
      decisionProofHash: proofHash,
      onChainTxHash: item.onChainTxHash,
      decidedBy: 'system',
    });
    await decision.save();

    // Update reputations
    await reputationService.updateAllVoters(itemId, label, U_r);

    // Update submitter stats
    if (submitter) {
      submitter.totalSubmissions += 1;
      const isCorrect = label !== 'Uncertain' && label !== 'Likely False' && label !== 'False';
      if (isCorrect) submitter.correctSubmissions += 1;
      await submitter.save();
    }
  } else {
    // Not enough confidence yet
    if (item.status !== 'classified') {
      item.status = S >= MIN_S ? 'pending_review' : 'pending';
    }
    await item.save();
  }

  return item;
}

/**
 * Reviewer manually classifies an item.
 */
async function manualClassify(itemId, classification, reviewerId) {
  const { T, F, U, S, P, U_r, C } = await aggregateItem(itemId);

  const item = await NewsItem.findById(itemId).populate('submitterId');
  if (!item) throw new Error('NewsItem not found');

  const submitter = item.submitterId;
  const S_r = submitter
    ? submitter.correctSubmissions / (submitter.totalSubmissions || 1)
    : 0;
  const E = item.evidenceScore || 0;
  const Cred = computeCredibility(P, C, E, S_r, U_r);

  item.classification = classification;
  item.status = 'classified';
  item.finalizedAt = new Date();
  item.T = T;
  item.F = F;
  item.U = U;
  item.S = S;
  item.polarity = P;
  item.confidence = C;
  item.uncertaintyRatio = U_r;
  item.credibilityScore = Cred;

  const proofString = `${item.contentHash}:${classification}:${T}:${F}:${U}:${C}:${P}:reviewer:${reviewerId}`;
  const proofHash = sha256(proofString);

  // Blockchain decision logging removed for ERDS demo
  await item.save();

  const decision = new Decision({
    itemId,
    classification,
    credibilityScore: Cred,
    polarity: P,
    confidence: C,
    uncertaintyRatio: U_r,
    T,
    F,
    U,
    S,
    decisionProofHash: proofHash,
    onChainTxHash: item.onChainTxHash,
    decidedBy: 'reviewer',
    reviewerId,
  });
  await decision.save();

  await reputationService.updateAllVoters(itemId, classification, U_r);

  if (submitter) {
    submitter.totalSubmissions += 1;
    const isCorrect = classification !== 'Uncertain' && classification !== 'Likely False' && classification !== 'False';
    if (isCorrect) submitter.correctSubmissions += 1;
    await submitter.save();
  }

  return item;
}

module.exports = { evaluateItem, manualClassify, classifyFromP };
