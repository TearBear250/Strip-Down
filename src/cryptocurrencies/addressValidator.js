'use strict';

/**
 * Lightweight address format validators for each supported cryptocurrency.
 * These perform structural (regex-based) checks only and do NOT verify
 * ownership of the private key.
 */

const PATTERNS = {
  // P2PKH (1…), P2SH (3…) or native SegWit (bc1…)
  BTC: /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{6,87})$/,
  // Checksummed or lower-case hex, 0x-prefixed, 40 hex chars
  ETH: /^0x[0-9a-fA-F]{40}$/,
  // TRON base-58 addresses start with 'T', 34 characters total
  TRX: /^T[a-km-zA-HJ-NP-Z1-9]{33}$/,
  // USDC uses the same address format as its host chain (ETH or TRX)
  USDC: /^0x[0-9a-fA-F]{40}$|^T[a-km-zA-HJ-NP-Z1-9]{33}$/,
  // BNB Smart Chain reuses the Ethereum address format
  BNB: /^0x[0-9a-fA-F]{40}$/,
};

/**
 * Validates a wallet address for the given currency symbol.
 *
 * @param {string} currency - One of 'BTC', 'ETH', 'TRX', 'USDC', 'BNB'.
 * @param {string} address  - The wallet address to validate.
 * @returns {boolean} True when the address matches the expected format.
 */
function validateAddress(currency, address) {
  if (typeof currency !== 'string' || typeof address !== 'string') {
    return false;
  }
  const pattern = PATTERNS[currency.toUpperCase()];
  if (!pattern) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return pattern.test(address);
}

module.exports = { validateAddress, PATTERNS };
