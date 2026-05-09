# Lendsqr Fintech MVP - Demo Credit

Demo Credit API built with Express, TypeScript, Knex, and MySQL as instructed. It supports user onboarding, wallet operations, bank recipient management, Paystack funding and withdrawals, blacklist checks, and webhook-driven reconciliation.

## Stack

- Node.js + TypeScript
- Express.js
- Knex.js
- MySQL for runtime data
- SQLite for test isolation
- Jest + Supertest for integration tests

## Features

- User registration with Adjutor Karma blacklist checks
- Token-based authentication for protected routes
- Wallet creation and wallet retrieval
- Wallet funding initialization through Paystack
- Wallet-to-wallet transfers with atomic balance updates and ledger entries
- Withdrawal to bank accounts with reversal flow on transfer failure
- Bank enquiry and recipient creation for saved beneficiaries
- Public bank list lookup from Paystack
- Request logging with method, URL, status code, and response time
- Paystack webhook handling for `charge.success`, `transfer.success`, and `transfer.failed`

## API Routes

Base path: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### Wallets

- `POST /wallets/create`
- `GET /wallets/my-wallet`

### Accounts

- `GET /accounts/banks` - public bank list lookup
- `POST /accounts/fund` - initialize wallet funding
- `POST /accounts/withdraw` - withdraw to a bank account
- `POST /accounts/transfer` - wallet-to-wallet transfer
- `POST /accounts/bank-enquiry` - resolve bank account name
- `POST /accounts/add-recipient` - save a recipient after bank enquiry
- `GET /accounts/recipients` - list saved recipients

### Paystack

- `POST /paystack/webhook`

## Request Shapes

The money movement endpoints require an `idempotency_key` so retries do not create duplicate transactions.

### Fund wallet

```json
{
	"amount": 5000,
	"idempotency_key": "fund-001"
}
```

### Withdraw

```json
{
	"amount": 2000,
	"pin": "1234",
	"account_number": "0123456789",
	"idempotency_key": "withdraw-001"
}
```

The withdraw flow looks up a saved recipient by `account_number`, validates the PIN, then sends the transfer through Paystack.

### Wallet transfer

```json
{
	"amount": 1500,
	"receiver_wallet_id": "wallet-uuid",
	"pin": "1234",
	"idempotency_key": "transfer-001"
}
```

### Bank enquiry

```json
{
	"account_number": "0123456789",
	"bank_code": "058"
}
```

### Add recipient

```json
{
	"account_number": "0123456789",
	"bank_code": "058"
}
```

The `bank_code` should be the Paystack bank code such as `058` or `044`, not the internal bank id returned in bank listings.

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
- Wallet balance changes are wrapped in database transactions.
- Ledger rows are append-only and used for auditability.
- Transaction references are unique and used as idempotency keys.
- Transaction metadata stores Paystack response details such as the authorization URL.

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

## Scripts

- `npm run dev` - start the server with `nodemon`
- `npm run build` - compile TypeScript to `dist/`
- `npm start` - run the compiled server
- `npm test` - run the test suite in band
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - run tests with coverage
- `npm run lint` - lint source files
- `npm run format` - format source files
- `npm run migrate` - apply Knex migrations
- `npm run migrate:make` - create a new migration
- `npm run seed:run` - run database seeds

## Test Setup

Tests run with `NODE_ENV=test` and use an SQLite database for speed and isolation.

Commands:

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Design Notes

- Request logging is handled centrally in `src/app.ts` and logs method, URL, status code, and duration.
- Critical money movement operations use database transactions and row locking.
- Withdrawal failures reverse the deducted balance and record a `REVERSAL` ledger entry.
- Recipient creation is preceded by a bank enquiry so the account name is resolved before saving.
- Paystack webhook handlers rely on the raw request body for signature verification.

## Submission Notes TODO

- Add your E-R Diagram to this README before final submission.
- Add deployment URL, repository URL, and review video URL in your submission document.
