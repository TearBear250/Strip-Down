'use strict';

const { BasePOSAdapter } = require('./BasePOSAdapter');

/**
 * StripeAdapter
 *
 * Bridges cryptocurrency payments into the Stripe payment platform.
 *
 * How it works:
 *  1. A merchant creates a CryptoPaymentRequest (e.g. a Bitcoin URI shown
 *     as a QR code or tapped via NFC).
 *  2. Once the on-chain transaction is confirmed, this adapter converts
 *     the crypto amount to fiat (using a configured exchange-rate provider)
 *     and records a Stripe PaymentIntent so the POS / accounting system
 *     sees a standard card-equivalent transaction.
 *
 * NOTE: Direct Stripe API calls require the `stripe` npm package and a
 * valid `secretKey`.  In environments where that package is not present
 * or no key is provided the adapter still functions in "offline / mock"
 * mode so it can be unit-tested without real credentials.
 */
class StripeAdapter extends BasePOSAdapter {
  /**
   * @param {object} config
   * @param {string} [config.secretKey]          - Stripe secret API key (sk_live_… / sk_test_…).
   * @param {string} [config.currency]           - ISO 4217 fiat currency code (default 'usd').
   * @param {Function} [config.exchangeRateFn]   - Async function(cryptoCurrency) => fiatRate.
   *                                               Defaults to a stub that returns 1.
   * @param {boolean} [config.mock]              - Force mock mode even if secretKey is provided.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'StripeAdapter';
    this.fiatCurrency = (config.currency || 'usd').toLowerCase();
    this.exchangeRateFn = config.exchangeRateFn || (async () => 1);
    this._mock = config.mock || !config.secretKey;

    if (!this._mock) {
      try {
        // Lazily load the official `stripe` package when available.
        const Stripe = require('stripe');
        this._stripe = new Stripe(config.secretKey, { apiVersion: '2023-10-16' });
      } catch {
        this._mock = true;
      }
    }
  }

  // ─── BasePOSAdapter hooks ────────────────────────────────────────────────

  _onPaymentConfirmed(payment) {
    // Automatically record the confirmed crypto payment in Stripe.
    this.submitPayment(payment).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[StripeAdapter] Failed to record payment:', err.message);
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Records a confirmed cryptocurrency payment as a Stripe PaymentIntent
   * (or returns a mock object in offline mode).
   *
   * @param {object} paymentData
   * @param {string} paymentData.currency  - Crypto symbol (BTC, ETH, …).
   * @param {string} paymentData.amount    - Amount in crypto's primary unit.
   * @param {string} paymentData.id        - Internal payment ID.
   * @param {string} [paymentData.txHash]  - On-chain transaction hash.
   * @returns {Promise<object>} Stripe PaymentIntent or mock result.
   */
  async submitPayment(paymentData) {
    const { currency, amount, id, txHash } = paymentData;
    const rate = await this.exchangeRateFn(currency);
    const fiatAmount = Math.round(parseFloat(amount) * rate * 100); // cents

    const params = {
      amount: fiatAmount,
      currency: this.fiatCurrency,
      payment_method_types: ['card'],
      metadata: {
        crypto_currency: currency,
        crypto_amount: String(amount),
        crypto_tx_hash: txHash || '',
        internal_payment_id: id,
      },
      confirm: false,
    };

    if (this._mock) {
      return {
        id: `pi_mock_${id}`,
        object: 'payment_intent',
        status: 'succeeded',
        ...params,
      };
    }

    return this._stripe.paymentIntents.create(params);
  }

  /**
   * Issues a refund for a Stripe PaymentIntent.
   *
   * @param {string} paymentIntentId
   * @param {number} [amount] - Amount in smallest fiat unit (cents). Full refund if omitted.
   * @returns {Promise<object>}
   */
  async refundPayment(paymentIntentId, amount) {
    if (this._mock) {
      return { id: `re_mock_${paymentIntentId}`, object: 'refund', status: 'succeeded', amount };
    }
    const params = { payment_intent: paymentIntentId };
    if (amount !== undefined) params.amount = amount;
    return this._stripe.refunds.create(params);
  }

  /**
   * Retrieves the status of a Stripe PaymentIntent.
   *
   * @param {string} paymentIntentId
   * @returns {Promise<object>}
   */
  async getTransactionStatus(paymentIntentId) {
    if (this._mock) {
      return { id: paymentIntentId, object: 'payment_intent', status: 'succeeded' };
    }
    return this._stripe.paymentIntents.retrieve(paymentIntentId);
  }
}

module.exports = { StripeAdapter };
