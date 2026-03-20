'use strict';

/**
 * BasePOSAdapter
 *
 * Abstract base class for all Point-of-Sale terminal adapters.
 * Each concrete adapter (Stripe, Clover, Generic, …) extends this class
 * and provides a platform-specific implementation of `submitPayment`,
 * `refundPayment`, and `getTransactionStatus`.
 */
class BasePOSAdapter {
  /**
   * @param {object} config - Adapter-specific configuration (API keys, terminal ID, …).
   */
  constructor(config = {}) {
    if (new.target === BasePOSAdapter) {
      throw new Error('BasePOSAdapter is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'BasePOSAdapter';
  }

  /**
   * Attaches a CryptoPaymentProcessor to this POS adapter.
   * The adapter will listen for 'confirmed' events and forward them
   * to the POS platform.
   *
   * @param {import('../cryptocurrencies/CryptoPaymentProcessor').CryptoPaymentProcessor} processor
   */
  attachProcessor(processor) {
    this.processor = processor;
    processor.on('confirmed', (payment) => this._onPaymentConfirmed(payment));
    processor.on('failed', (payment) => this._onPaymentFailed(payment));
    return this;
  }

  // ─── Hooks called by the processor ───────────────────────────────────────

  /** Called when a crypto payment is confirmed on-chain. */
  _onPaymentConfirmed(_payment) {
    // Subclasses may override to trigger POS-side settlement.
  }

  /** Called when a crypto payment fails or expires. */
  _onPaymentFailed(_payment) {
    // Subclasses may override to void the POS-side order.
  }

  // ─── Abstract interface ───────────────────────────────────────────────────

  /**
   * Submits a payment to the POS platform.
   * Must be implemented by subclasses.
   *
   * @param {object} paymentData
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async submitPayment(paymentData) {
    throw new Error(`${this.name}.submitPayment() must be implemented`);
  }

  /**
   * Requests a refund for a previously submitted payment.
   *
   * @param {string} transactionId
   * @param {number} [amount]
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async refundPayment(transactionId, amount) {
    throw new Error(`${this.name}.refundPayment() must be implemented`);
  }

  /**
   * Retrieves the current status of a transaction.
   *
   * @param {string} transactionId
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async getTransactionStatus(transactionId) {
    throw new Error(`${this.name}.getTransactionStatus() must be implemented`);
  }
}

module.exports = { BasePOSAdapter };
