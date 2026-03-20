'use strict';

/**
 * Supported cryptocurrency identifiers.
 */
const CURRENCIES = {
  BITCOIN: 'BTC',
  ETHEREUM: 'ETH',
  TRON: 'TRX',
  USDC: 'USDC',
  BINANCE: 'BNB',
};

/**
 * Network identifiers for each currency.
 * USDC is supported on both Ethereum (ERC-20) and TRON (TRC-20).
 */
const NETWORKS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  TRX: 'tron',
  USDC_ERC20: 'ethereum',
  USDC_TRC20: 'tron',
  BNB: 'binance-smart-chain',
};

/**
 * URI schemes used to encode payment requests (BIP-21 style).
 */
const URI_SCHEMES = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  TRX: 'tron',
  USDC: 'ethereum',
  BNB: 'bnb',
};

module.exports = { CURRENCIES, NETWORKS, URI_SCHEMES };
