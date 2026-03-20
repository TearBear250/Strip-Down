// stripe adapter (implemented)
// Uses the official stripe SDK. Ensure STRIPE_SECRET_KEY is set in environment.

const Stripe = require('stripe');
let client = null;

function getClient() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      // Delay throwing so callers can handle missing keys gracefully in tests/dev
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    // Use a reasonably recent API version; adjust as needed.
    client = new Stripe(key, { apiVersion: '2022-11-15' });
  }
  return client;
}

module.exports = {
  init: function(config) {
    // Optional: allow injecting a mocked client for tests or advanced setups
    if (config && config.client) {
      client = config.client;
    }
  },

  createPaymentIntent: async function({ amount, currency, metadata }) {
    if (!amount || !currency) {
      throw new Error('amount and currency required');
    }
    const stripe = getClient();
    const params = {
      amount,
      currency,
      metadata: metadata || {},
      // For card-present or alternative payment flows, configure accordingly.
    };
    const intent = await stripe.paymentIntents.create(params);
    return intent;
  }
};
