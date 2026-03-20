'use strict';

const { BasePOSAdapter } = require('./BasePOSAdapter');

/**
 * GenericPOSAdapter
 *
 * A flexible adapter for any POS terminal or payment platform not covered
 * by the first-party Stripe / Clover adapters.
 *
 * It communicates via a simple configurable HTTP REST endpoint, making it
 * straightforward to integrate with Verifone, PAX, Ingenico, Square,
 * PayPal Here, or any custom in-house POS system.
 *
 * Configuration contract expected from the POS endpoint:
 *
 *   POST /payments
 *     Body: { currency, amount, cryptoCurrency, cryptoAmount, txHash, externalRef }
 *     Response: { transactionId, status, ... }
 *
 *   POST /refunds
 *     Body: { transactionId, amount? }
 *     Response: { refundId, status, ... }
 *
 *   GET /payments/:transactionId
 *     Response: { transactionId, status, ... }
 */
class GenericPOSAdapter extends BasePOSAdapter {
  /**
   * @param {object} config
   * @param {string} [config.endpoint]         - Base URL of the POS REST endpoint.
   * @param {object} [config.headers]          - Extra HTTP headers (auth tokens, etc.).
   * @param {string} [config.fiatCurrency]     - ISO 4217 fiat code (default 'USD').
   * @param {Function} [config.exchangeRateFn] - Async (cryptoCurrency) => fiatRate.
   * @param {boolean} [config.mock]            - Force mock mode (no real HTTP calls).
   */
  constructor(config = {}) {
    super(config);
    this.name = 'GenericPOSAdapter';
    this.endpoint = config.endpoint || '';
    this.extraHeaders = config.headers || {};
    this.fiatCurrency = (config.fiatCurrency || 'USD').toUpperCase();
    this.exchangeRateFn = config.exchangeRateFn || (async () => 1);
    this._mock = config.mock || !config.endpoint;
  }

  _buildHeaders() {
    return {
      'Content-Type': 'application/json',
      ...this.extraHeaders,
    };
  }

  async _request(method, path, body) {
    if (this._mock) {
      return { mock: true, method, path, body };
    }
    const fetch = globalThis.fetch;
    if (!fetch) throw new Error('fetch is not available; upgrade to Node 18+ or provide a polyfill');

    const url = `${this.endpoint}${path}`;
    const res = await fetch(url, {
      method,
      headers: this._buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`POS API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ─── BasePOSAdapter hooks ─────────────────────────────────────────────────

  _onPaymentConfirmed(payment) {
    this.submitPayment(payment).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[GenericPOSAdapter] Failed to submit payment:', err.message);
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Submits a confirmed crypto payment to the generic POS endpoint.
   *
   * @param {object} paymentData
   * @returns {Promise<object>}
   */
  async submitPayment(paymentData) {
    const { currency, amount, id, txHash } = paymentData;
    const rate = await this.exchangeRateFn(currency);
    const fiatAmount = parseFloat(amount) * rate;

    const body = {
      currency: this.fiatCurrency,
      amount: fiatAmount,
      cryptoCurrency: currency,
      cryptoAmount: String(amount),
      txHash: txHash || '',
      externalRef: id,
    };

    const result = await this._request('POST', '/payments', body);

    if (this._mock) {
      return { transactionId: `txn_mock_${id}`, status: 'success', ...body };
    }
    return result;
  }

  /**
   * Requests a refund.
   *
   * @param {string} transactionId
   * @param {number} [amount]
   * @returns {Promise<object>}
   */
  async refundPayment(transactionId, amount) {
    const body = { transactionId, ...(amount !== undefined && { amount }) };
    if (this._mock) {
      return { refundId: `ref_mock_${transactionId}`, status: 'success', ...body };
    }
    return this._request('POST', '/refunds', body);
  }

  /**
   * Retrieves the status of a transaction.
   *
   * @param {string} transactionId
   * @returns {Promise<object>}
   */
  async getTransactionStatus(transactionId) {
    if (this._mock) {
      return { transactionId, status: 'success' };
    }
    return this._request('GET', `/payments/${transactionId}`);
  }
}

module.exports = { GenericPOSAdapter };
