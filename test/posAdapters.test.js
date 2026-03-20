'use strict';

const { StripeAdapter } = require('../src/pos/StripeAdapter');
const { CloverAdapter } = require('../src/pos/CloverAdapter');
const { GenericPOSAdapter } = require('../src/pos/GenericPOSAdapter');
const { BasePOSAdapter } = require('../src/pos/BasePOSAdapter');
const { CryptoPaymentProcessor } = require('../src/cryptocurrencies/CryptoPaymentProcessor');

const ETH_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B';
const BTC_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

// ─── BasePOSAdapter ───────────────────────────────────────────────────────────

describe('BasePOSAdapter', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new BasePOSAdapter()).toThrow('abstract');
  });
});

// ─── StripeAdapter ────────────────────────────────────────────────────────────

describe('StripeAdapter (mock mode)', () => {
  let adapter;
  beforeEach(() => {
    adapter = new StripeAdapter({ mock: true, currency: 'usd' });
  });

  it('submitPayment returns a mock PaymentIntent', async () => {
    const result = await adapter.submitPayment({
      currency: 'ETH',
      amount: '1.0',
      id: 'pay_test',
      txHash: '0xdeadbeef',
    });
    expect(result.id).toContain('mock');
    expect(result.status).toBe('succeeded');
    expect(result.metadata.crypto_currency).toBe('ETH');
  });

  it('refundPayment returns a mock refund', async () => {
    const result = await adapter.refundPayment('pi_mock_123', 1000);
    expect(result.id).toContain('mock');
    expect(result.status).toBe('succeeded');
  });

  it('getTransactionStatus returns a mock status', async () => {
    const result = await adapter.getTransactionStatus('pi_mock_123');
    expect(result.status).toBe('succeeded');
  });

  it('uses exchangeRateFn to convert crypto amount', async () => {
    const adapterWithRate = new StripeAdapter({
      mock: true,
      exchangeRateFn: async () => 30000, // 1 BTC = $30,000
    });
    const result = await adapterWithRate.submitPayment({
      currency: 'BTC',
      amount: '0.001',
      id: 'pay_btc',
    });
    // 0.001 BTC × $30,000 × 100 cents = 3000 cents
    expect(result.amount).toBe(3000);
  });

  it('integrates with CryptoPaymentProcessor via attachProcessor', async () => {
    const processor = new CryptoPaymentProcessor({
      currency: 'ETH',
      merchantAddress: ETH_ADDRESS,
    });
    adapter.attachProcessor(processor);

    const submitSpy = jest.spyOn(adapter, 'submitPayment').mockResolvedValue({});
    const payment = processor.createPaymentRequest({ amount: 0.5 });
    processor.updatePaymentStatus(payment.id, 'CONFIRMED', { txHash: '0xabc' });

    // Allow async _onPaymentConfirmed to fire
    await new Promise((r) => setImmediate(r));
    expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
  });
});

// ─── CloverAdapter ────────────────────────────────────────────────────────────

describe('CloverAdapter (mock mode)', () => {
  let adapter;
  beforeEach(() => {
    adapter = new CloverAdapter({ mock: true });
  });

  it('submitPayment returns orderId and tenderId', async () => {
    const result = await adapter.submitPayment({
      currency: 'BTC',
      amount: '0.001',
      id: 'pay_clover_1',
    });
    expect(result.orderId).toContain('mock');
    expect(result.tenderId).toContain('mock');
  });

  it('refundPayment returns a mock result', async () => {
    const result = await adapter.refundPayment('ord_mock_1', 500);
    expect(result.mock).toBe(true);
  });

  it('getTransactionStatus returns a mock result', async () => {
    const result = await adapter.getTransactionStatus('ord_mock_1');
    expect(result.mock).toBe(true);
  });

  it('integrates with CryptoPaymentProcessor via attachProcessor', async () => {
    const processor = new CryptoPaymentProcessor({
      currency: 'BTC',
      merchantAddress: BTC_ADDRESS,
    });
    adapter.attachProcessor(processor);

    const submitSpy = jest.spyOn(adapter, 'submitPayment').mockResolvedValue({});
    const payment = processor.createPaymentRequest({ amount: 0.001 });
    processor.updatePaymentStatus(payment.id, 'CONFIRMED');

    await new Promise((r) => setImmediate(r));
    expect(submitSpy).toHaveBeenCalled();
  });
});

// ─── GenericPOSAdapter ────────────────────────────────────────────────────────

describe('GenericPOSAdapter (mock mode)', () => {
  let adapter;
  beforeEach(() => {
    adapter = new GenericPOSAdapter({ mock: true, fiatCurrency: 'EUR' });
  });

  it('submitPayment returns a mock transaction', async () => {
    const result = await adapter.submitPayment({
      currency: 'TRX',
      amount: '200',
      id: 'pay_generic_1',
    });
    expect(result.transactionId).toContain('mock');
    expect(result.status).toBe('success');
    expect(result.currency).toBe('EUR');
  });

  it('refundPayment returns a mock refund', async () => {
    const result = await adapter.refundPayment('txn_mock_1', 100);
    expect(result.refundId).toContain('mock');
    expect(result.status).toBe('success');
  });

  it('getTransactionStatus returns mock status', async () => {
    const result = await adapter.getTransactionStatus('txn_mock_1');
    expect(result.status).toBe('success');
  });
});
