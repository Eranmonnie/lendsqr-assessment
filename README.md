# Demo Credit — Wallet Service

An MVP wallet service built for the Lendsqr Backend Engineering Assessment.

Demo Credit allows users to create accounts, fund wallets, transfer funds to 
other users, and withdraw to bank accounts — with Adjutor Karma blacklist 
verification on onboarding and Paystack-powered payment processing.

- **Live API:** https://lendsqr-assessment-8yra.onrender.com
- **API Docs:** https://lendsqr-assessment-8yra.onrender.com/api-docs
- **Design Document:** https://www.notion.so/Lendsqr-Backend-Engineer-Assessment-Ajala-Oluwaferanmi-35c9466ef8c580f59e22c108b946c209?source=copy_link

## Table of Contents

- [Stack](#stack)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Scripts](#scripts)

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js LTS + TypeScript |
| Framework | Express.js |
| ORM | Knex.js |
| Database | MySQL (runtime), SQLite (tests) |
| Validation | Zod |
| Auth | JWT |
| Payments | Paystack |
| Testing | Jest + Supertest |
| Docs | Swagger (swagger-jsdoc) |

---

## Entity Relationship Diagram

<img src="landsqr-assessment.svg" width="700" />

---

## Local Setup

### Prerequisites
- Node.js LTS
- MySQL running locally

### Install & Run

```bash
cp .env.example .env   # configure your environment variables
npm install
npm run migrate
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Server port |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiry duration |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_MODE` | `live` or `mock` |
| `SALT_ROUND` | bcrypt salt rounds |
| `ADJUTOR_API_KEY` | Lendsqr Adjutor API key |
| `ADJUTOR_BASE_URL` | Lendsqr Adjutor base URL |
| `BLACKLIST_MODE` | `strict`, `lenient`, or `disabled` |

Set `BLACKLIST_MODE=strict` and `PAYSTACK_MODE=live` for production.

Use `PAYSTACK_MODE=mock` to run the app locally without hitting the Paystack API.

---

## API Reference

Full interactive documentation is available at `/api-docs` when the server is running.

Base path: `/api`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register a new user | ❌ |
| POST | `/auth/login` | Login and receive JWT | ❌ |
| GET | `/auth/profile` | Get authenticated user profile | ✅ |
| POST | `/auth/logout` | Logout | ✅ |
| POST | `/wallets/create` | Create a wallet | ✅ |
| GET | `/wallets/my-wallet` | Get wallet details | ✅ |
| GET | `/accounts/banks` | List banks from Paystack | ✅ |
| POST | `/accounts/fund` | Initialize wallet funding | ✅ |
| POST | `/accounts/withdraw` | Withdraw to bank account | ✅ |
| POST | `/accounts/transfer` | Transfer to another wallet | ✅ |
| POST | `/accounts/bank-enquiry` | Resolve a bank account name | ✅ |
| POST | `/accounts/wallet-enquiry` | Verify a recipient wallet | ✅ |
| POST | `/accounts/add-recipient` | Save a bank recipient | ✅ |
| GET | `/accounts/recipients` | List saved recipients | ✅ |
| GET | `/transactions` | List transactions | ✅ |
| GET | `/transactions/summary` | Credit/debit totals | ✅ |
| GET | `/transactions/:id` | Get single transaction | ✅ |
| POST | `/paystack/webhook` | Paystack webhook receiver | ❌ |

Money movement endpoints (`fund`, `transfer`, `withdraw`) require an 
`idempotency_key` in the request body to prevent duplicate processing.

---

## Running Tests

```bash
npm test                  # run all tests
npm run test:coverage     # generate coverage report
```

Tests use SQLite and run entirely in isolation — no external DB or API 
calls required.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm test` | Run test suite |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files |
| `npm run migrate` | Run migrations |
| `npm run migrate:make` | Create a new migration |
| `npm run seed:run` | Run seeds |