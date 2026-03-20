'use strict';

const { CryptoPaymentProcessor, STATUS } = require('../src/cryptocurrencies/CryptoPaymentProcessor');

const ADDRESSES = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ETH: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
  TRX: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  USDC: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
  BNB: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
};

describe('CryptoPaymentProcessor', () => {
  describe('constructor', () => {
    it('creates a processor for BTC', () => {
      const p = new CryptoPaymentProcessor({ currency: 'BTC', merchantAddress: ADDRESSES.BTC });
      expect(p.currency).toBe('BTC');
      expect(p.merchantAddress).toBe(ADDRESSES.BTC);
    });

    it.each(['ETH', 'TRX', 'USDC', 'BNB'])('creates a processor for %s', (sym) => {
      const p = new CryptoPaymentProcessor({ currency: sym, merchantAddress: ADDRESSES[sym] });
      expect(p.currency).toBe(sym);
    });

    it('throws when currency is missing', () => {
      expect(() => new CryptoPaymentProcessor({ merchantAddress: ADDRESSES.BTC })).toThrow(
        'currency is required',
      );
    });

    it('throws when merchantAddress is missing', () => {
      expect(() => new CryptoPaymentProcessor({ currency: 'BTC' })).toThrow(
        'merchantAddress is required',
      );
    });

    it('throws for an unsupported currency', () => {
      expect(() =>
        new CryptoPaymentProcessor({ currency: 'DOGE', merchantAddress: ADDRESSES.BTC }),
      ).toThrow('Unsupported currency');
    });

    it('throws for an invalid merchant address', () => {
      expect(() =>
        new CryptoPaymentProcessor({ currency: 'BTC', merchantAddress: 'badaddress' }),
      ).toThrow('Invalid BTC merchant address');
    });
  });

  describe('createPaymentRequest', () => {
    let processor;
    beforeEach(() => {
      processor = new CryptoPaymentProcessor({ currency: 'BTC', merchantAddress: ADDRESSES.BTC });
    });

    it('returns a payment object with status PENDING', () => {
      const payment = processor.createPaymentRequest({ amount: 0.001 });
      expect(payment.status).toBe(STATUS.PENDING);
      expect(payment.currency).toBe('BTC');
      expect(payment.amount).toBe('0.001');
      expect(payment.uri).toMatch(/^bitcoin:/);
    });

    it('uses the provided orderId', () => {
      const payment = processor.createPaymentRequest({ amount: 0.001, orderId: 'order-123' });
      expect(payment.id).toBe('order-123');
    });

    it('emits a "pending" event', () => {
      const cb = jest.fn();
      processor.on('pending', cb);
      processor.createPaymentRequest({ amount: 0.001 });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('throws when amount is missing', () => {
      expect(() => processor.createPaymentRequest({})).toThrow('amount is required');
    });
  });

  describe('updatePaymentStatus', () => {
    let processor;
    let payment;

    beforeEach(() => {
      processor = new CryptoPaymentProcessor({ currency: 'ETH', merchantAddress: ADDRESSES.ETH });
      payment = processor.createPaymentRequest({ amount: 0.5 });
    });

    it('transitions to CONFIRMED', () => {
      const updated = processor.updatePaymentStatus(payment.id, STATUS.CONFIRMED, {
        txHash: '0xabc123',
      });
      expect(updated.status).toBe(STATUS.CONFIRMED);
      expect(updated.txHash).toBe('0xabc123');
    });

    it('emits a "confirmed" event', () => {
      const cb = jest.fn();
      processor.on('confirmed', cb);
      processor.updatePaymentStatus(payment.id, STATUS.CONFIRMED);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ status: STATUS.CONFIRMED }));
    });

    it('transitions to FAILED', () => {
      processor.updatePaymentStatus(payment.id, STATUS.FAILED);
      expect(processor.getPayment(payment.id).status).toBe(STATUS.FAILED);
    });

    it('transitions to EXPIRED', () => {
      processor.updatePaymentStatus(payment.id, STATUS.EXPIRED);
      expect(processor.getPayment(payment.id).status).toBe(STATUS.EXPIRED);
    });

    it('throws for an unknown payment ID', () => {
      expect(() => processor.updatePaymentStatus('nonexistent', STATUS.CONFIRMED)).toThrow(
        'Payment not found',
      );
    });

    it('throws for an invalid status', () => {
      expect(() => processor.updatePaymentStatus(payment.id, 'BANANA')).toThrow('Invalid status');
    });
  });

  describe('listPayments', () => {
    it('returns all created payments', () => {
      const processor = new CryptoPaymentProcessor({
        currency: 'BTC',
        merchantAddress: ADDRESSES.BTC,
      });
      processor.createPaymentRequest({ amount: 0.001 });
      processor.createPaymentRequest({ amount: 0.002 });
      expect(processor.listPayments()).toHaveLength(2);
    });
  });

  describe('event emitter', () => {
    it('supports removing a listener', () => {
      const processor = new CryptoPaymentProcessor({
        currency: 'BTC',
        merchantAddress: ADDRESSES.BTC,
      });
      const cb = jest.fn();
      processor.on('pending', cb);
      processor.off('pending', cb);
      processor.createPaymentRequest({ amount: 0.001 });
      expect(cb).not.toHaveBeenCalled();
    });

    it('throws when listener is not a function', () => {
      const processor = new CryptoPaymentProcessor({
        currency: 'BTC',
        merchantAddress: ADDRESSES.BTC,
      });
      expect(() => processor.on('pending', 'notafunction')).toThrow('Listener must be a function');
    });
  });
});
