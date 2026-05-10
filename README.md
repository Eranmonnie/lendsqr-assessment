# Lendsqr Backend Engineering Assessment — Demo Credit Wallet Service

Demo Credit is an MVP wallet service built for the Lendsqr Backend Engineering Assessment using Express, TypeScript, Knex, MySQL, and Zod validation.

The system supports user onboarding, wallet management, transaction processing, bank recipient management, Paystack-powered funding and withdrawals, blacklist verification, webhook reconciliation, and ledger-backed transaction auditing.

---

# Stack

- Node.js + TypeScript
- Express.js
- Knex.js
- MySQL for runtime data
- SQLite for fast, isolated test execution
- Jest + Supertest for integration testing
- Zod for runtime environment validation

---

# Features

- User registration with Adjutor Karma blacklist checks
- JWT-based authentication for protected routes
- Wallet creation and wallet retrieval
- Wallet funding initialization through Paystack
- Wallet-to-wallet transfers with atomic balance updates and ledger entries
- Withdrawal to bank accounts with reversal flow on transfer failure
- Bank enquiry and recipient creation for saved beneficiaries
- Public bank list lookup from Paystack
- Transaction history with credit/debit classification
- Request logging with method, URL, status code, and response time
- Paystack live or mock provider mode for local and restricted environments
- Paystack webhook handling for `charge.success`, `transfer.success`, and `transfer.failed`

The blacklist verification flow is controlled by `BLACKLIST_MODE`:

- `strict` rejects onboarding if the Adjutor check cannot be completed
- `lenient` logs the failure and allows onboarding
- `disabled` skips the external check entirely

---

# Architecture

The application follows a layered architecture:

- Controllers → HTTP request/response handling
- Services → business logic and transaction orchestration
- Repositories → database access abstraction
- Middleware → authentication, validation, and error handling

This separation improves:

- maintainability
- testability
- transaction safety
- code reuse
- separation of concerns

---

# API Routes

Base path: `/api`

## Documentation

Interactive API documentation is available at:

```txt
/api-docs
```

when the server is running.

---

# Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- `POST /auth/logout`

---

# Wallets

- `POST /wallets/create`
- `GET /wallets/my-wallet`

---

# Accounts

- `GET /accounts/banks`
  - Public bank list lookup with pagination metadata

- `POST /accounts/fund`
  - Initialize wallet funding

- `POST /accounts/withdraw`
  - Withdraw to a bank account

- `POST /accounts/transfer`
  - Wallet-to-wallet transfer

- `POST /accounts/bank-enquiry`
  - Resolve bank account name

- `POST /accounts/wallet-enquiry`
  - Verify recipient wallet exists and is active

- `POST /accounts/add-recipient`
  - Save a recipient after bank enquiry

- `GET /accounts/recipients`
  - List saved recipients with pagination

---

# Transactions

- `GET /transactions`
  - List authenticated user's transactions

- `GET /transactions/:transactionId`
  - Get a single transaction by id

- `GET /transactions/summary`
  - Get credit/debit totals and net balance

---

# Paystack

- `POST /paystack/webhook`

Paystack behavior is controlled by `PAYSTACK_MODE`:

- `live` uses the real Paystack API
- `mock` returns simulated responses for funding, bank lookup, recipient creation, and withdrawals

Use `mock` when the Paystack account cannot initiate third-party payouts, or when you want to run the app locally without hitting the external API.

---

# Request Shapes

Money movement endpoints require an `idempotency_key` so retries do not create duplicate transactions.

List endpoints return a consistent pagination shape using:

- `limit`
- `offset`
- `total`
- `hasMore`

Example:

```json
{
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 5,
    "hasMore": false
  }
}
```

---

# Fund Wallet

```json
{
  "amount": 5000,
  "idempotency_key": "fund-001"
}
```

---

# Withdraw

```json
{
  "amount": 2000,
  "pin": "1234",
  "account_number": "0123456789",
  "idempotency_key": "withdraw-001"
}
```

The withdrawal flow:

1. Resolves a saved recipient
2. Validates the wallet PIN
3. Creates transaction and ledger records
4. Sends the transfer through Paystack
5. Reverses the transaction on failure

---

# Wallet Transfer

```json
{
  "amount": 1500,
  "receiver_wallet_id": "wallet-uuid",
  "pin": "1234",
  "idempotency_key": "transfer-001"
}
```

The transfer endpoint rejects attempts to transfer funds to the same wallet.

---

# Bank Enquiry

```json
{
  "account_number": "0123456789",
  "bank_code": "058"
}
```

---

# Wallet Enquiry

```json
{
  "receiver_wallet_id": "wallet-uuid"
}
```

The response returns:

- wallet id
- status
- currency
- owner information

This allows users to verify recipient wallets before initiating transfers.

---

# Add Recipient

```json
{
  "account_number": "0123456789",
  "bank_code": "058"
}
```

The `bank_code` must use the Paystack bank code such as:

- `058`
- `044`

and not the internal id returned in bank listings.

---

# Transactions

Transaction records are classified from the authenticated user's perspective:

- `CREDIT`
  - Incoming transfers and successful wallet funding

- `DEBIT`
  - Outgoing transfers and withdrawals

Supported query parameters for `/transactions`:

```txt
type=CREDIT|DEBIT|ALL
status=PENDING|SUCCESS|FAILED
limit=10
offset=0
```

---

# Data Model Summary

Core tables:

- `users`
- `wallets`
- `transactions`
- `ledger_entries`
- `blacklist_checks`
- `recipients`
- `webhooks`

---

# ERD

Source diagram:

```txt
landsqr-assessment.svg
```

<img src="landsqr-assessment.svg" width="700" />

---

# Database Design

The model is ledger-centric.

Transactions represent business events such as:

- funding
- transfers
- withdrawals

Ledger entries represent the actual balance mutations applied to wallets.

Each financial operation generates one or more append-only ledger entries that serve as the immutable audit trail for wallet balance changes.

This separation improves:

- auditability
- rollback traceability
- reversal support
- financial consistency
- future fee support

Additional entities include:

- `recipients`
  - Saved bank beneficiaries after successful bank enquiry

- `blacklist_checks`
  - Adjutor Karma verification records used during onboarding

- `webhooks`
  - Persisted Paystack webhook events used for reconciliation

Transaction metadata is stored in `transactions.meta` to preserve external provider responses such as authorization URLs and transfer references.

---

# Transaction Atomicity

Critical money movement operations such as:

- funding
- transfers
- withdrawals

execute inside database transaction scopes using Knex transactions.

This guarantees:

- atomic debit/credit execution
- rollback safety
- balance consistency
- prevention of partial writes

Critical balance updates also use row locking where necessary to minimize concurrent modification issues.

If any operation fails during execution, all related balance mutations and ledger writes are rolled back.

---

# Design Notes

- Monetary values use `DECIMAL(18,2)`
- Ledger entries are append-only and immutable
- Wallet balance changes are wrapped in database transactions
- Transaction references are unique and used as idempotency keys
- Request logging is centralized in `src/app.ts`
- Paystack webhook verification relies on the raw request body
- Environment variables are validated during startup using Zod
- Recipient creation is preceded by bank enquiry validation
- Withdrawal failures trigger reversal ledger entries
- Pagination responses follow a unified structure

---

# Environment Variables

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
- `PAYSTACK_MODE`
- `SALT_ROUND`
- `ADJUTOR_API_KEY`
- `ADJUTOR_BASE_URL`
- `BLACKLIST_MODE`

Recommended value for production: `BLACKLIST_MODE=strict`.
Recommended value for production Paystack usage: `PAYSTACK_MODE=live`.

Environment variables are validated during startup and the application exits early if required values are missing or invalid.

---

# Local Setup

## Install Dependencies

```bash
npm install
```

## Run Migrations

```bash
npm run migrate
```

## Start Development Server

```bash
npm run dev
```

---

# Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files |
| `npm run migrate` | Run Knex migrations |
| `npm run migrate:make` | Create migration |
| `npm run seed:run` | Run seeds |

---

# Test Setup

Tests run using:

```txt
NODE_ENV=test
```

SQLite is used during testing for:

- speed
- isolation
- deterministic test execution

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

---

# Scalability Considerations

The MVP architecture was intentionally designed to allow future improvements such as:

- Redis-backed distributed locking
- Queue-based webhook processing
- Background retry workers
- Event-driven ledger processing
- Read replicas for reporting queries
- Centralized observability and tracing
- Advanced fraud detection
- Rate limiting

---

# Deployment

The API is expected to be deployed using the required assessment format:

```txt
https://lendsqr-assessment-8yra.onrender.com
```

Swagger documentation should remain accessible at:

```txt
https://lendsqr-assessment-8yra.onrender.com/api-docs/
```