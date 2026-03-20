# strip (project-strip)

Strip is a gateway prototype to enable cryptocurrency-based payments that interoperate with merchant point-of-sale systems (Clover-compatible readers) and existing payment rails (Stripe and other settlement options). The project provides a server-side gateway that accepts crypto payment intents from NFC devices/mobile wallets and translates/settles them to merchant accounts.

Status: scaffold / prototype

Badges

- CI: <img src="https://github.com/TearBear250/Strip-Down/actions/workflows/ci.yml/badge.svg">

Features added in this update

- Dockerfile & docker-compose for local development
- GitHub Actions CI workflow (runs Jest tests)
- Implemented Stripe adapter using the official Stripe SDK (STRIPE_SECRET_KEY required)
- Jest test scaffold and example tests for the Stripe adapter
- Full MIT license
- package.json updated with dependencies and test script

Quick start (development)

1. Copy repository to your machine or run the commands to push to your GitHub repo.
2. Create a `.env` file from `.env.example` and fill in secrets (STRIPE_SECRET_KEY, CLOVER_* etc).
3. Install dev deps for local testing:
   npm install
4. Run tests:
   npm test
5. Start locally:
   npm run dev

Docker (optional)

Build and run with docker-compose:

  docker-compose up --build

Security & compliance reminder

Do NOT commit secret keys. Use environment variables or secret stores. For production Clover/Stripe integrations ensure you follow PCI and provider policies.
