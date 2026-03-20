'use strict';

const { BasePOSAdapter } = require('./BasePOSAdapter');

/**
 * CloverAdapter
 *
 * Integrates cryptocurrency payments with the Clover POS platform.
 *
 * Clover exposes a REST API (<https://developers.clover.com>) that allows
 * third-party apps to create orders and record payments.  This adapter:
 *  1. Creates a Clover Order when a new crypto payment is requested.
 *  2. Records a custom tender ("Crypto") on the order when the on-chain
 *     payment is confirmed.
 *  3. Supports refunds through the Clover Refunds API.
 *
 * When no `apiKey` / `merchantId` are provided the adapter operates in
 * "mock" mode — useful for unit tests and offline development.
 */
class CloverAdapter extends BasePOSAdapter {
  /**
   * @param {object} config
   * @param {string} [config.apiKey]           - Clover API access token.
   * @param {string} [config.merchantId]       - Clover merchant ID (mId).
   * @param {string} [config.baseUrl]          - API base URL (default: production endpoint).
   * @param {Function} [config.exchangeRateFn] - Async (cryptoCurrency) => fiatRate.
   * @param {boolean} [config.mock]            - Force mock mode.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'CloverAdapter';
    this.apiKey = config.apiKey || '';
    this.merchantId = config.merchantId || '';
    this.baseUrl = config.baseUrl || 'https://api.clover.com/v3';
    this.exchangeRateFn = config.exchangeRateFn || (async () => 1);
    this._mock = config.mock || !config.apiKey || !config.merchantId;
  }

  /** Builds Authorization headers for Clover API calls. */
  _headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** Makes an HTTP request to the Clover API (or returns a mock). */
  async _request(method, path, body) {
    if (this._mock) {
      return { mock: true, method, path, body };
    }
    // Use the built-in fetch (Node 18+) or a polyfill.
    const fetch = globalThis.fetch;
    if (!fetch) throw new Error('fetch is not available; upgrade to Node 18+ or provide a polyfill');

    const url = `${this.baseUrl}/merchants/${this.merchantId}${path}`;
    const res = await fetch(url, {
      method,
      headers: this._headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clover API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ─── BasePOSAdapter hooks ─────────────────────────────────────────────────

  _onPaymentConfirmed(payment) {
    this.submitPayment(payment).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[CloverAdapter] Failed to record payment:', err.message);
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Creates a Clover order and records a crypto tender.
   *
   * @param {object} paymentData
   * @param {string} paymentData.currency  - Crypto symbol (BTC, ETH, …).
   * @param {string} paymentData.amount    - Amount in crypto's primary unit.
   * @param {string} paymentData.id        - Internal payment ID.
   * @param {string} [paymentData.txHash]  - On-chain transaction hash.
   * @returns {Promise<{ orderId: string, tenderId: string, raw: object }>}
   */
  async submitPayment(paymentData) {
    const { currency, amount, id, txHash } = paymentData;
    const rate = await this.exchangeRateFn(currency);
    // Clover amounts are in cents.
    const fiatAmountCents = Math.round(parseFloat(amount) * rate * 100);

    // 1. Create order
    const order = await this._request('POST', '/orders', {
      title: `Crypto Payment – ${currency}`,
      currency: 'USD',
      note: `crypto:${currency} amount:${amount} tx:${txHash || 'pending'} ref:${id}`,
    });

    const orderId = this._mock ? `ord_mock_${id}` : order.id;

    // 2. Record tender on the order
    const tender = await this._request('POST', `/orders/${orderId}/payments`, {
      tender: { label: `${currency} (crypto)` },
      amount: fiatAmountCents,
      note: `Internal ID: ${id}`,
    });

    const tenderId = this._mock ? `tnd_mock_${id}` : tender.id;
    return { orderId, tenderId, raw: { order, tender } };
  }

  /**
   * Issues a refund on a Clover order.
   *
   * @param {string} orderId
   * @param {number} [amount] - Amount in cents. Full refund if omitted.
   * @returns {Promise<object>}
   */
  async refundPayment(orderId, amount) {
    const body = amount !== undefined ? { amount } : {};
    return this._request('POST', `/orders/${orderId}/refunds`, body);
  }

  /**
   * Retrieves the current status of a Clover order.
   *
   * @param {string} orderId
   * @returns {Promise<object>}
   */
  async getTransactionStatus(orderId) {
    return this._request('GET', `/orders/${orderId}`);
  }
}

module.exports = { CloverAdapter };
