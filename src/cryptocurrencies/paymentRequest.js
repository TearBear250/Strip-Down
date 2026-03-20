'use strict';

const { URI_SCHEMES } = require('./constants');
const { validateAddress } = require('./addressValidator');

/**
 * Builds a BIP-21-style payment URI for the given cryptocurrency.
 *
 * Examples:
 *   bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf?amount=0.001&label=Merchant
 *   ethereum:0xAb5801a7D398351b8bE11C439e05C5B3259aec9B?value=1000000000000000000
 *   tron:TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7?amount=10&token=USDC
 *
 * @param {object} options
 * @param {string} options.currency   - 'BTC' | 'ETH' | 'TRX' | 'USDC' | 'BNB'
 * @param {string} options.address    - Recipient wallet address.
 * @param {number|string} options.amount - Amount in the currency's primary unit.
 * @param {string} [options.label]    - Optional merchant / order label.
 * @param {string} [options.message]  - Optional human-readable message.
 * @param {string} [options.network]  - 'ERC20' or 'TRC20' for USDC.
 * @returns {string} Payment URI string.
 */
function buildPaymentURI({ currency, address, amount, label, message, network }) {
  if (!currency || !address || amount === undefined || amount === null) {
    throw new Error('currency, address, and amount are required');
  }

  const sym = currency.toUpperCase();

  if (!validateAddress(sym === 'USDC' && network === 'TRC20' ? 'TRX' : sym, address)) {
    throw new Error(`Invalid ${sym} address: ${address}`);
  }

  const scheme = URI_SCHEMES[sym];
  if (!scheme) {
    throw new Error(`Unsupported currency: ${sym}`);
  }

  const params = new URLSearchParams();
  params.set('amount', String(amount));
  if (label) params.set('label', label);
  if (message) params.set('message', message);
  if (sym === 'USDC') {
    params.set('token', 'USDC');
    if (network) params.set('network', network);
  }

  return `${scheme}:${address}?${params.toString()}`;
}

/**
 * Parses a payment URI back into its components.
 *
 * @param {string} uri - A payment URI (e.g. bitcoin:1A1z…?amount=0.001).
 * @returns {{ scheme: string, address: string, params: object }}
 */
function parsePaymentURI(uri) {
  if (typeof uri !== 'string') {
    throw new TypeError('uri must be a string');
  }
  const colonIdx = uri.indexOf(':');
  if (colonIdx === -1) {
    throw new Error('Invalid payment URI: missing scheme');
  }
  const scheme = uri.slice(0, colonIdx);
  const rest = uri.slice(colonIdx + 1);
  const qIdx = rest.indexOf('?');
  const address = qIdx === -1 ? rest : rest.slice(0, qIdx);
  const queryString = qIdx === -1 ? '' : rest.slice(qIdx + 1);
  const params = Object.fromEntries(new URLSearchParams(queryString));
  return { scheme, address, params };
}

module.exports = { buildPaymentURI, parsePaymentURI };
