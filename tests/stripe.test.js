// Jest test for stripe adapter. We mock the stripe package to avoid network calls.

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test_123', amount: 1000, currency: 'usd', status: 'requires_payment_method' })
    }
  }));
});

const stripeAdapter = require('../src/payments/stripe');

describe('stripe adapter', () => {
  test('createPaymentIntent returns intent object', async () => {
    const intent = await stripeAdapter.createPaymentIntent({ amount: 1000, currency: 'usd' });
    expect(intent).toHaveProperty('id', 'pi_test_123');
    expect(intent).toHaveProperty('amount', 1000);
  });

  test('missing amount or currency throws', async () => {
    await expect(stripeAdapter.createPaymentIntent({ amount: null, currency: 'usd' })).rejects.toThrow();
    await expect(stripeAdapter.createPaymentIntent({ amount: 100, currency: null })).rejects.toThrow();
  });
});
