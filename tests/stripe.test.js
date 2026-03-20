// Jest test for stripe adapter. We mock the stripe package to avoid network calls.

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test_123', amount: 1000, currency: 'usd', status: 'requires_payment_method' })
    }
  }));
});

// Set a fake key so getClient() passes the env check (Stripe is fully mocked above).
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

const stripeAdapter = require('../src/payments/stripe');

beforeEach(() => {
  // Reset the module-level client singleton so each test starts fresh.
  stripeAdapter.init({ client: null });
});

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
