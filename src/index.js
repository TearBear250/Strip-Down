'use strict';

/**
 * Strip-Down: NFC + Cryptocurrency Payment Compatibility Layer
 *
 * A unified library for processing Bitcoin, Ethereum, TRON, USDC, and
 * Binance (BNB) payments on merchant-class POS terminals (Stripe, Clover,
 * and generic REST-based platforms) using NFC and QR-code payment URIs.
 *
 * @module strip-down
 */

const crypto = require('./cryptocurrencies');
const nfc = require('./nfc');
const pos = require('./pos');

module.exports = {
  // Re-export everything from the sub-modules for convenience
  ...crypto,
  ...nfc,
  ...pos,

  // Also expose the namespaced sub-modules for tree-shaking / explicit imports
  crypto,
  nfc,
  pos,
};
