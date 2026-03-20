'use strict';

const { CURRENCIES } = require('./constants');
const { validateAddress } = require('./addressValidator');
const { buildPaymentURI } = require('./paymentRequest');

/**
 * Payment statuses returned / stored by the processor.
 */
const STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
};

/**
 * CryptoPaymentProcessor
 *
 * Central orchestrator for cryptocurrency payment processing.
 * It provides a unified API regardless of which coin is used,
 * and emits status events so POS adapters can react to payment updates.
 *
 * Usage:
 *   const processor = new CryptoPaymentProcessor({ currency: 'BTC', merchantAddress: '1A1z…' });
 *   const request    = processor.createPaymentRequest({ amount: 0.001, label: 'Order #42' });
 *   processor.on('confirmed', (payment) => console.log('Paid!', payment));
 */
class CryptoPaymentProcessor {
  /**
   * @param {object} config
   * @param {string} config.currency         - 'BTC' | 'ETH' | 'TRX' | 'USDC' | 'BNB'
   * @param {string} config.merchantAddress  - Merchant's wallet address for this currency.
   * @param {string} [config.network]        - For USDC: 'ERC20' (default) or 'TRC20'.
   * @param {number} [config.confirmations]  - Minimum confirmations to mark as CONFIRMED (default 1).
   */
  constructor({ currency, merchantAddress, network = 'ERC20', confirmations = 1 } = {}) {
    if (!currency) throw new Error('currency is required');
    if (!merchantAddress) throw new Error('merchantAddress is required');

    const sym = currency.toUpperCase();
    if (!Object.values(CURRENCIES).includes(sym)) {
      throw new Error(`Unsupported currency: ${sym}. Supported: ${Object.values(CURRENCIES).join(', ')}`);
    }

    if (!validateAddress(sym, merchantAddress)) {
      throw new Error(`Invalid ${sym} merchant address: ${merchantAddress}`);
    }

    this.currency = sym;
    this.merchantAddress = merchantAddress;
    this.network = network;
    this.confirmations = confirmations;
    this._listeners = {};
    this._payments = new Map();
  }

  // ─── Event emitter (minimal) ──────────────────────────────────────────────

  /**
   * Registers an event listener.
   * @param {'pending'|'confirmed'|'failed'|'expired'} event
   * @param {Function} fn
   */
  on(event, fn) {
    if (typeof fn !== 'function') throw new TypeError('Listener must be a function');
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  }

  /** Removes a specific listener for the given event. */
  off(event, fn) {
    const list = this._listeners[event];
    if (list) {
      this._listeners[event] = list.filter((l) => l !== fn);
    }
    return this;
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => fn(data));
  }

  // ─── Payment management ───────────────────────────────────────────────────

  /**
   * Creates and stores a new payment request.
   *
   * @param {object} options
   * @param {number|string} options.amount  - Amount in the currency's primary unit.
   * @param {string}  [options.label]       - Order label / description.
   * @param {string}  [options.message]     - Additional human-readable note.
   * @param {string}  [options.orderId]     - Merchant-side order ID.
   * @returns {{ id: string, uri: string, currency: string, amount: string,
   *             address: string, status: string, createdAt: Date }}
   */
  createPaymentRequest({ amount, label, message, orderId } = {}) {
    if (amount === undefined || amount === null) throw new Error('amount is required');

    const id = orderId || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const uri = buildPaymentURI({
      currency: this.currency,
      address: this.merchantAddress,
      amount,
      label,
      message,
      network: this.network,
    });

    const payment = {
      id,
      uri,
      currency: this.currency,
      amount: String(amount),
      address: this.merchantAddress,
      status: STATUS.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this._payments.set(id, payment);
    this._emit('pending', payment);
    return payment;
  }

  /**
   * Updates the status of an existing payment (e.g. after a blockchain callback).
   *
   * @param {string} id                - The payment ID.
   * @param {'CONFIRMED'|'FAILED'|'EXPIRED'} newStatus
   * @param {object} [meta]            - Optional extra data (txHash, blockHeight, …).
   * @returns {object} Updated payment object.
   */
  updatePaymentStatus(id, newStatus, meta = {}) {
    const payment = this._payments.get(id);
    if (!payment) throw new Error(`Payment not found: ${id}`);

    if (!Object.values(STATUS).includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    payment.status = newStatus;
    payment.updatedAt = new Date();
    Object.assign(payment, meta);

    this._payments.set(id, payment);

    const eventName = newStatus.toLowerCase();
    this._emit(eventName, payment);
    return payment;
  }

  /**
   * Retrieves a payment by its ID.
   *
   * @param {string} id
   * @returns {object|undefined}
   */
  getPayment(id) {
    return this._payments.get(id);
  }

  /** Returns all payments as an array. */
  listPayments() {
    return Array.from(this._payments.values());
  }
}

module.exports = { CryptoPaymentProcessor, STATUS };
