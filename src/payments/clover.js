// clover adapter (stubbed)
// Note: Clover POS integrations typically require using the Clover API/SDK and merchant-specific credentials.
// This file is a placeholder showing expected function signatures.

module.exports = {
  init: function(config) {
    // Setup Clover client with config.CLOVER_API_KEY, etc.
  },

  createPaymentRequest: async function({ amount, currency, metadata }) {
    // High level:
    // - Create an order or payment request via Clover API
    // - Use merchant id and POS/reader to present payment to merchant device
    // - Monitor status/callbacks via webhook
    return {
      id: 'clover_request_stub_123',
      amount,
      currency,
      status: 'pending'
    };
  }
};
