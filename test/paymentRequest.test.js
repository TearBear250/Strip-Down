'use strict';

const { buildPaymentURI, parsePaymentURI } = require('../src/cryptocurrencies/paymentRequest');

const VALID = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ETH: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
  TRX: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  BNB: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
};

describe('buildPaymentURI', () => {
  it('builds a Bitcoin payment URI', () => {
    const uri = buildPaymentURI({ currency: 'BTC', address: VALID.BTC, amount: 0.001 });
    expect(uri).toMatch(/^bitcoin:/);
    expect(uri).toContain(VALID.BTC);
    expect(uri).toContain('amount=0.001');
  });

  it('includes label and message when provided', () => {
    const uri = buildPaymentURI({
      currency: 'ETH',
      address: VALID.ETH,
      amount: 1,
      label: 'Order #42',
      message: 'Thank you',
    });
    expect(uri).toContain('label=Order+%2342');
    expect(uri).toContain('message=Thank+you');
  });

  it('builds an Ethereum payment URI', () => {
    const uri = buildPaymentURI({ currency: 'ETH', address: VALID.ETH, amount: 0.5 });
    expect(uri).toMatch(/^ethereum:/);
  });

  it('builds a TRON payment URI', () => {
    const uri = buildPaymentURI({ currency: 'TRX', address: VALID.TRX, amount: 100 });
    expect(uri).toMatch(/^tron:/);
  });

  it('builds a USDC payment URI with network tag', () => {
    const uri = buildPaymentURI({
      currency: 'USDC',
      address: VALID.ETH,
      amount: 50,
      network: 'ERC20',
    });
    expect(uri).toContain('token=USDC');
    expect(uri).toContain('network=ERC20');
  });

  it('builds a BNB payment URI', () => {
    const uri = buildPaymentURI({ currency: 'BNB', address: VALID.BNB, amount: 2 });
    expect(uri).toMatch(/^bnb:/);
  });

  it('throws when required fields are missing', () => {
    expect(() => buildPaymentURI({ currency: 'BTC', address: VALID.BTC })).toThrow(
      'currency, address, and amount are required',
    );
  });

  it('throws for an invalid address', () => {
    expect(() =>
      buildPaymentURI({ currency: 'BTC', address: 'badaddress', amount: 0.001 }),
    ).toThrow('Invalid BTC address');
  });
});

describe('parsePaymentURI', () => {
  it('correctly round-trips a Bitcoin URI', () => {
    const uri = buildPaymentURI({ currency: 'BTC', address: VALID.BTC, amount: 0.001, label: 'Test' });
    const parsed = parsePaymentURI(uri);
    expect(parsed.scheme).toBe('bitcoin');
    expect(parsed.address).toBe(VALID.BTC);
    expect(parsed.params.amount).toBe('0.001');
    expect(parsed.params.label).toBe('Test');
  });

  it('parses a URI without query parameters', () => {
    const parsed = parsePaymentURI('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(parsed.scheme).toBe('bitcoin');
    expect(parsed.address).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(parsed.params).toEqual({});
  });

  it('throws for a non-string input', () => {
    expect(() => parsePaymentURI(123)).toThrow(TypeError);
  });

  it('throws for a URI missing the scheme separator', () => {
    expect(() => parsePaymentURI('nocolon')).toThrow('Invalid payment URI');
  });
});
