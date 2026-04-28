require('dotenv').config();
const { ethers } = require('ethers');

// Simplified ABIs matching the stripped-down contracts
const SUBMISSION_ABI = [
  'function log(bytes32 contentHash, bytes32 metadataHash) external',
  'function getSubmission(bytes32 contentHash) external view returns (bytes32, uint64, bool)',
  'function getTotal() external view returns (uint256)',
  'function getKeyAtIndex(uint256 i) external view returns (bytes32)',
  'event Logged(bytes32 indexed contentHash, bytes32 metadataHash, uint256 timestamp)',
];

const VOTE_ABI = [
  'function commit(bytes32 itemHash, bytes32 voteHash) external',
  'function getVoteCommitments(bytes32 itemHash) external view returns (bytes32[])',
  'function getVoteCount(bytes32 itemHash) external view returns (uint256)',
  'function getTotal() external view returns (uint256)',
  'function getVoteAtIndex(uint256 i) external view returns (bytes32)',
  'event Committed(bytes32 indexed itemHash, bytes32 voteHash, uint256 timestamp)',
];

const DECISION_ABI = [
  'function finalize(bytes32 contentHash, string calldata label, bytes32 proofHash) external',
  'function getDecision(bytes32 contentHash) external view returns (string, bytes32, uint64, bool)',
  'function getTotal() external view returns (uint256)',
  'function getKeyAtIndex(uint256 i) external view returns (bytes32)',
  'event Finalized(bytes32 indexed contentHash, string label, bytes32 proofHash, uint256 timestamp)',
];

const REPUTATION_ABI = [
  'function commitSnapshot(uint256 epochNumber, bytes32 stateHash) external',
  'function getSnapshot(uint256 epochNumber) external view returns (bytes32, uint64, bool)',
  'function getLatestEpoch() external view returns (uint256)',
  'event SnapshotCommitted(uint256 indexed epochNumber, bytes32 stateHash, uint256 timestamp)',
];

let provider = null;
let wallet = null;
let initialized = false;

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  }
  return provider;
}

function getWallet() {
  if (!initialized) {
    try {
      const pk = process.env.DEPLOYER_PRIVATE_KEY;
      if (!pk) { console.warn('DEPLOYER_PRIVATE_KEY not set. Blockchain logging disabled.'); return null; }
      wallet = new ethers.Wallet(pk, getProvider());
      initialized = true;
    } catch (e) { console.warn('Wallet init failed:', e.message); }
  }
  return wallet;
}

function getContract(address, abi, useWallet = true) {
  if (!address) return null;
  const signer = useWallet ? getWallet() : getProvider();
  if (!signer) return null;
  return new ethers.Contract(address, abi, signer);
}

// ── WRITE ──

async function logSubmission(contentHash, metadataHash) {
  try {
    const c = getContract(process.env.SUBMISSION_REGISTRY_ADDRESS, SUBMISSION_ABI);
    if (!c) return null;
    const tx = await c.log(contentHash, metadataHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logSubmission failed:', e.message); return null; }
}

async function logVoteCommitment(itemHash, voteHash) {
  try {
    const c = getContract(process.env.VOTE_AUDIT_LEDGER_ADDRESS, VOTE_ABI);
    if (!c) return null;
    const tx = await c.commit(itemHash, voteHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logVoteCommitment failed:', e.message); return null; }
}

async function logDecision(contentHash, label, proofHash) {
  try {
    const c = getContract(process.env.DECISION_REGISTRY_ADDRESS, DECISION_ABI);
    if (!c) return null;
    const tx = await c.finalize(contentHash, label, proofHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logDecision failed:', e.message); return null; }
}

async function logReputationSnapshot(epochNumber, stateHash) {
  try {
    const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI);
    if (!c) return null;
    const tx = await c.commitSnapshot(epochNumber, stateHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logReputationSnapshot failed:', e.message); return null; }
}

// ── READ (for explorer) ──

async function getHealth() {
  try {
    const p = getProvider();
    const blockNumber = await p.getBlockNumber();
    const network = await p.getNetwork();
    return { connected: true, blockNumber, chainId: Number(network.chainId), rpcUrl: process.env.HARDHAT_RPC_URL || 'http://localhost:8545' };
  } catch (e) { return { connected: false, error: e.message }; }
}

async function getStats() {
  const p = getProvider();
  const blockNumber = await p.getBlockNumber();
  let totalSubmissions = 0, totalVotes = 0, totalDecisions = 0, latestEpoch = 0;
  try { const c = getContract(process.env.SUBMISSION_REGISTRY_ADDRESS, SUBMISSION_ABI, false); if (c) totalSubmissions = Number(await c.getTotal()); } catch {}
  try { const c = getContract(process.env.VOTE_AUDIT_LEDGER_ADDRESS, VOTE_ABI, false); if (c) totalVotes = Number(await c.getTotal()); } catch {}
  try { const c = getContract(process.env.DECISION_REGISTRY_ADDRESS, DECISION_ABI, false); if (c) totalDecisions = Number(await c.getTotal()); } catch {}
  try { const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI, false); if (c) latestEpoch = Number(await c.getLatestEpoch()); } catch {}
  return { blockNumber, totalSubmissions, totalVotes, totalDecisions, latestEpoch };
}

async function getSubmissions(page = 1, limit = 20) {
  const c = getContract(process.env.SUBMISSION_REGISTRY_ADDRESS, SUBMISSION_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.getTotal());
  const start = Math.max(0, total - page * limit);
  const end = Math.max(0, total - (page - 1) * limit);
  const items = [];
  for (let i = end - 1; i >= start; i--) {
    try {
      const key = await c.getKeyAtIndex(i);
      const [metadataHash, timestamp, exists] = await c.getSubmission(key);
      items.push({ contentHash: key, metadataHash, timestamp: Number(timestamp), exists, index: i });
    } catch { break; }
  }
  return { items, total };
}

async function getVoteEvents(page = 1, limit = 20) {
  const c = getContract(process.env.VOTE_AUDIT_LEDGER_ADDRESS, VOTE_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.getTotal());
  const start = Math.max(0, total - page * limit);
  const end = Math.max(0, total - (page - 1) * limit);
  const items = [];
  for (let i = end - 1; i >= start; i--) {
    try { items.push({ voteHash: await c.getVoteAtIndex(i), index: i }); } catch { break; }
  }
  return { items, total };
}

async function getDecisionEvents(page = 1, limit = 20) {
  const c = getContract(process.env.DECISION_REGISTRY_ADDRESS, DECISION_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.getTotal());
  const start = Math.max(0, total - page * limit);
  const end = Math.max(0, total - (page - 1) * limit);
  const items = [];
  for (let i = end - 1; i >= start; i--) {
    try {
      const key = await c.getKeyAtIndex(i);
      const [label, proofHash, timestamp, exists] = await c.getDecision(key);
      items.push({ contentHash: key, label, proofHash, timestamp: Number(timestamp), exists, index: i });
    } catch { break; }
  }
  return { items, total };
}

async function getSnapshotEvents() {
  const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI, false);
  if (!c) return { items: [], latestEpoch: 0 };
  const latestEpoch = Number(await c.getLatestEpoch());
  const items = [];
  for (let i = latestEpoch; i >= 1; i--) {
    try {
      const [stateHash, timestamp, exists] = await c.getSnapshot(i);
      if (exists) items.push({ epochNumber: i, stateHash, timestamp: Number(timestamp) });
    } catch { break; }
  }
  return { items, latestEpoch };
}

module.exports = {
  logSubmission, logVoteCommitment, logDecision, logReputationSnapshot,
  getHealth, getStats, getSubmissions, getVoteEvents, getDecisionEvents, getSnapshotEvents,
};
