const crypto = require('crypto');

/**
 * Compute SHA-256 hash of a string, returns hex string
 */
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/**
 * Convert a hex string to a bytes32 Buffer for use with ethers
 */
function hexToBytes32(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = clean.padEnd(64, '0').slice(0, 64);
  return '0x' + padded;
}

module.exports = { sha256, hexToBytes32 };
