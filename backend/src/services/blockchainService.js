require('dotenv').config();
const { ethers } = require('ethers');

// Simplified ABI for the new ERDS ReputationRegistry
const REPUTATION_ABI = [
  'function logUpdate(bytes32 userIdHash, bytes32 initialHash, bytes32 changeHash, bytes32 finalHash) external',
  'function getUpdate(uint256 index) external view returns (bytes32, bytes32, bytes32, bytes32, uint64, bool)',
  'function totalUpdates() external view returns (uint256)',
  'event ReputationUpdated(uint256 indexed updateIndex, bytes32 indexed userIdHash, bytes32 initialHash, bytes32 changeHash, bytes32 finalHash, uint64 timestamp)',
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

async function logReputationUpdate(userIdHash, initialHash, changeHash, finalHash) {
  try {
    const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI);
    if (!c) return null;
    const tx = await c.logUpdate(userIdHash, initialHash, changeHash, finalHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logReputationUpdate failed:', e.message); return null; }
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
  let totalReputationUpdates = 0;
  try { 
    const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI, false); 
    if (c) totalReputationUpdates = Number(await c.totalUpdates()); 
  } catch {}
  return { blockNumber, totalReputationUpdates };
}

async function getUpdateEvents(page = 1, limit = 20) {
  const c = getContract(process.env.REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.totalUpdates());
  const start = Math.max(1, total - page * limit + 1);
  const end = total - (page - 1) * limit;
  const items = [];
  for (let i = end; i >= start; i--) {
    if (i <= 0) break;
    try {
      const [userIdHash, initialHash, changeHash, finalHash, timestamp, exists] = await c.getUpdate(i);
      if (exists) {
        items.push({
          updateIndex: i,
          userIdHash,
          initialHash,
          changeHash,
          finalHash,
          timestamp: Number(timestamp)
        });
      }
    } catch { break; }
  }
  return { items, total };
}

module.exports = {
  logReputationUpdate,
  getHealth, getStats, getUpdateEvents,
};
