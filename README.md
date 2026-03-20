# Strip-Down

**NFC + Cryptocurrency Payment Compatibility Layer for Merchant-Class POS Terminals**

Strip-Down is an open-source Node.js library that bridges NFC-based cryptocurrency payments into mainstream merchant Point-of-Sale platforms — including **Stripe**, **Clover**, and any generic REST-based POS system.

Supported cryptocurrencies:
| Symbol | Network |
|--------|---------|
| **BTC** | Bitcoin |
| **ETH** | Ethereum |
| **TRX** | TRON |
| **USDC** | Ethereum ERC-20 / TRON TRC-20 |
| **BNB** | Binance Smart Chain |

---

## Features

- 🔗 **Multi-currency** – Bitcoin, Ethereum, TRON, USDC, and BNB out of the box.
- 📱 **NFC-ready** – Encode/decode payment URIs into NDEF buffers for smartphone and POS NFC readers.
- 🏪 **POS adapters** – First-party adapters for Stripe and Clover; a generic adapter for any REST endpoint (Verifone, PAX, Ingenico, Square, PayPal Here, …).
- ✅ **Address validation** – Structural address format checks for all supported currencies.
- 🔑 **BIP-21-style payment URIs** – Standard `bitcoin:`, `ethereum:`, `tron:`, `bnb:` URIs with amount, label, and message fields.
- 🧪 **Fully tested** – 76 unit tests, all passing.

---

## Installation

```bash
npm install strip-down
```

---

## Quick Start

### 1. Create a payment request (Bitcoin)

```js
const { CryptoPaymentProcessor } = require('strip-down');

const processor = new CryptoPaymentProcessor({
  currency: 'BTC',
  merchantAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
});

const payment = processor.createPaymentRequest({ amount: 0.001, label: 'Order #42' });
console.log(payment.uri);
// bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf?amount=0.001&label=Order+%2342
```

### 2. Write the payment URI to an NFC tag

```js
const { NFCInterface } = require('strip-down');

const nfc = new NFCInterface();   // pass { driver } for real hardware
await nfc.write(payment.uri);     // encodes as NDEF and writes to tag
```

### 3. Read the payment URI from an NFC tag

```js
const details = await nfc.readPaymentDetails();
console.log(details);
// { scheme: 'bitcoin', address: '1A1z…', params: { amount: '0.001', label: 'Order #42' } }
```

### 4. Confirm the payment and record it in Stripe

```js
const { StripeAdapter } = require('strip-down');

const stripe = new StripeAdapter({ secretKey: process.env.STRIPE_SECRET_KEY });
stripe.attachProcessor(processor);   // auto-records on blockchain confirmation

// Simulate a confirmed on-chain payment:
processor.updatePaymentStatus(payment.id, 'CONFIRMED', { txHash: '0xabc123' });
```

### 5. Use with Clover

```js
const { CloverAdapter } = require('strip-down');

const clover = new CloverAdapter({
  apiKey: process.env.CLOVER_API_KEY,
  merchantId: process.env.CLOVER_MERCHANT_ID,
});
clover.attachProcessor(processor);
```

### 6. Use with any generic POS

```js
const { GenericPOSAdapter } = require('strip-down');

const pos = new GenericPOSAdapter({
  endpoint: 'https://my-pos-system.example.com/api',
  headers: { Authorization: 'Bearer my-token' },
  fiatCurrency: 'USD',
  exchangeRateFn: async (sym) => fetchLiveRate(sym),  // your rate provider
});
pos.attachProcessor(processor);
```

---

## API Reference

### `CryptoPaymentProcessor`

| Method | Description |
|--------|-------------|
| `new CryptoPaymentProcessor({ currency, merchantAddress, network?, confirmations? })` | Create processor |
| `createPaymentRequest({ amount, label?, message?, orderId? })` | Build and store a new payment request |
| `updatePaymentStatus(id, status, meta?)` | Update status (`CONFIRMED`, `FAILED`, `EXPIRED`) |
| `getPayment(id)` | Retrieve a payment by ID |
| `listPayments()` | List all payments |
| `on(event, fn)` / `off(event, fn)` | Subscribe / unsubscribe to `pending`, `confirmed`, `failed`, `expired` |

### `NFCInterface`

| Method | Description |
|--------|-------------|
| `NFCInterface.encode(uri)` | Static: encode URI → NDEF Buffer |
| `NFCInterface.decode(buffer)` | Static: decode NDEF Buffer → URI |
| `write(uri)` | Write URI to NFC tag (or simulation) |
| `read()` | Read URI from NFC tag |
| `readPaymentDetails()` | Read and parse URI into `{ scheme, address, params }` |

### `validateAddress(currency, address)`

Returns `true` if `address` is a structurally valid address for the given `currency` symbol.

### `buildPaymentURI({ currency, address, amount, label?, message?, network? })`

Returns a BIP-21-style payment URI string.

### `parsePaymentURI(uri)`

Returns `{ scheme, address, params }`.

### POS Adapters (`StripeAdapter`, `CloverAdapter`, `GenericPOSAdapter`)

All extend `BasePOSAdapter` and expose:

| Method | Description |
|--------|-------------|
| `attachProcessor(processor)` | Wire up a `CryptoPaymentProcessor` |
| `submitPayment(paymentData)` | Record a payment in the POS platform |
| `refundPayment(transactionId, amount?)` | Issue a refund |
| `getTransactionStatus(transactionId)` | Retrieve transaction status |

---

## Development

```bash
npm test          # run all tests with coverage
npm run lint      # run ESLint
```

---

## License

ISC

