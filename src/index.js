/* Minimal Express server for Strip (gateway prototype)
   - Uses env vars from .env
   - Provides health check and a stubbed payment endpoint
*/

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const stripeAdapter = require('./payments/stripe');
const cloverAdapter = require('./payments/clover');

const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'strip' });
});

// Create payment intent (prototype/stub)
app.post('/api/payment/create', async (req, res) => {
  try {
    // Example payload expected:
    // { amount: 1000, currency: "usd", method: "crypto", metadata: { ... } }
    const { amount, currency, method, metadata } = req.body;
    if (!amount || !currency || !method) {
      return res.status(400).json({ error: 'amount, currency, and method required' });
    }

    // Route to adapter depending on method/merchant
    if (method === 'stripe') {
      const intent = await stripeAdapter.createPaymentIntent({ amount, currency, metadata });
      return res.json({ provider: 'stripe', intent });
    }

    if (method === 'clover') {
      // Clover flows are more complex (POS readers); this is a stub.
      const result = await cloverAdapter.createPaymentRequest({ amount, currency, metadata });
      return res.json({ provider: 'clover', result });
    }

    // method 'crypto' could map to an on-chain flow that ends with settlement via Stripe/Clover
    if (method === 'crypto') {
      // TODO: implement crypto-to-fiat settlement path
      return res.status(501).json({ error: 'crypto payment flow not implemented yet' });
    }

    return res.status(400).json({ error: 'unknown payment method' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`strip listening on port ${port}`);
});
