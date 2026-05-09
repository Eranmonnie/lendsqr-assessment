# Lendsqr Fintech MVP - Wallet Service

Wallet service API built with Express, TypeScript, Knex, and MySQL. It supports user onboarding, wallet operations, blacklisting checks, and webhook-driven reconciliation.

## Stack

- Node.js + TypeScript
- Express.js
- Knex.js
- MySQL (runtime)
- Jest + Supertest (tests)

## Features

- User registration with Adjutor Karma blacklist check
- User login/logout (token-based auth)
- Wallet creation and wallet retrieval
- Wallet funding initialization (Paystack)
- Wallet-to-wallet transfer with atomic balance updates
- Wallet withdrawal with reversal flow on transfer failure
- Recipient creation/listing for bank withdrawals
- Paystack webhook handling (`charge.success`, `transfer.success`, `transfer.failed`)

## API Routes

Base path: `/api`

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /wallets/create`
- `GET /wallets/my-wallet`
- `POST /accounts/fund`
- `POST /accounts/withdraw`
- `POST /accounts/transfer`
- `POST /accounts/add-recipient`
- `GET /accounts/recipients`
- `POST /paystack/webhook`

## Data Model Summary

Core tables:

- `users`
- `wallets`
- `transactions`
- `ledger_entries`
- `blacklist_checks`
- `recipients`
- `webhooks`

Notes:

- Monetary values use `DECIMAL(18,2)`.
- Wallet balance changes are wrapped in DB transactions.
- Ledger rows are append-only and used for auditability.
- Transaction `reference` values are unique and idempotent.

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PAYSTACK_SECRET_KEY`
- `SALT_ROUND`
- `ADJUTOR_API_KEY`
- `ADJUTOR_BASE_URL`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Run migrations:

```bash
npm run migrate
```

3. Start the server:

```bash
npm run dev
```

## Test Setup

Tests run with `NODE_ENV=test` and use an in-memory SQLite database for speed and isolation.

Commands:

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Design Notes

- DB transaction scoping is applied to critical money movement operations (`withdraw`, `transfer`, webhook reconciliation).
- On withdrawal transfer failure, deducted funds are reversed and recorded as a `REVERSAL` ledger entry.
- Blacklist checks are cached in `blacklist_checks` to reduce repeated external calls.

## Submission Notes

- Add your E-R Diagram to this README before final submission.
- Add deployment URL, repository URL, and review video URL in your submission document.
