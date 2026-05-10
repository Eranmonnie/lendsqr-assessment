import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import app from '../src/app';
import db from '../src/database/db';
import { authHeaderForUser, createUser, createWallet } from './helpers/factories';

const seedTransaction = async (overrides: Record<string, any>) =>
  db('transactions').insert({
    id: randomUUID(),
    type: 'FUND',
    amount: 1000,
    currency: 'NGN',
    reference: randomUUID(),
    status: 'SUCCESS',
    description: 'Seeded transaction',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

describe('TransactionController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists authenticated user transactions with pagination and classification', async () => {
    const user = await createUser({ email: 'tx-list@example.com' });
    const counterparty = await createUser({ email: 'tx-counterparty@example.com' });
    const wallet = await createWallet(user.id as string, { balance: 5000, status: 'ACTIVE' });
    const counterpartyWallet = await createWallet(counterparty.id as string, {
      balance: 1000,
      status: 'ACTIVE',
    });

    await seedTransaction({
      type: 'FUND',
      amount: 1500,
      reference: 'TX-LIST-FUND-1',
      receiver_wallet_id: wallet.id,
      created_at: new Date('2024-01-03T10:00:00.000Z'),
      updated_at: new Date('2024-01-03T10:00:00.000Z'),
    });

    await seedTransaction({
      type: 'TRANSFER',
      amount: 500,
      reference: 'TX-LIST-TRANSFER-1',
      sender_wallet_id: wallet.id,
      receiver_wallet_id: counterpartyWallet.id,
      created_at: new Date('2024-01-02T10:00:00.000Z'),
      updated_at: new Date('2024-01-02T10:00:00.000Z'),
    });

    await seedTransaction({
      type: 'WITHDRAWAL',
      amount: 250,
      reference: 'TX-LIST-WITHDRAW-1',
      sender_wallet_id: wallet.id,
      created_at: new Date('2024-01-01T10:00:00.000Z'),
      updated_at: new Date('2024-01-01T10:00:00.000Z'),
    });

    const res = await request(app)
      .get('/api/transactions?limit=3&offset=0')
      .set('Authorization', authHeaderForUser(user.id as string));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions).toHaveLength(3);
    expect(res.body.data.pagination).toEqual(
      expect.objectContaining({
        limit: 3,
        offset: 0,
        total: 3,
        hasMore: false,
      }),
    );

    const classifications = res.body.data.transactions.map((transaction: any) => transaction.classification);
    expect(classifications).toContain('CREDIT');
    expect(classifications).toContain('DEBIT');
  });

  it('returns a single transaction only when the authenticated user owns it', async () => {
    const user = await createUser({ email: 'tx-detail@example.com' });
    const otherUser = await createUser({ email: 'tx-detail-other@example.com' });
    const wallet = await createWallet(user.id as string, { balance: 3000, status: 'ACTIVE' });
    const otherWallet = await createWallet(otherUser.id as string, { balance: 1000, status: 'ACTIVE' });

    const transactionId = randomUUID();
    await db('transactions').insert({
      id: transactionId,
      type: 'TRANSFER',
      amount: 700,
      currency: 'NGN',
      reference: 'TX-DETAIL-1',
      status: 'SUCCESS',
      sender_wallet_id: wallet.id,
      receiver_wallet_id: otherWallet.id,
      description: 'Wallet transfer',
      created_at: new Date('2024-01-04T10:00:00.000Z'),
      updated_at: new Date('2024-01-04T10:00:00.000Z'),
    });

    const res = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', authHeaderForUser(user.id as string));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(transactionId);
    expect(res.body.data.classification).toBe('DEBIT');
    expect(res.body.data.direction).toBe('SENT');
    expect(res.body.data.counterparty.email).toBe(otherUser.email);
  });

  it('returns a transaction summary without averages', async () => {
    const user = await createUser({ email: 'tx-summary@example.com' });
    const otherUser = await createUser({ email: 'tx-summary-counterparty@example.com' });
    const wallet = await createWallet(user.id as string, { balance: 1000, status: 'ACTIVE' });
    const otherWallet = await createWallet(otherUser.id as string, { balance: 1000, status: 'ACTIVE' });

    await seedTransaction({
      type: 'FUND',
      amount: 2000,
      reference: 'TX-SUMMARY-FUND-1',
      status: 'SUCCESS',
      receiver_wallet_id: wallet.id,
      created_at: new Date('2024-01-05T10:00:00.000Z'),
      updated_at: new Date('2024-01-05T10:00:00.000Z'),
    });

    await seedTransaction({
      type: 'TRANSFER',
      amount: 600,
      reference: 'TX-SUMMARY-TRANSFER-1',
      status: 'SUCCESS',
      sender_wallet_id: wallet.id,
      receiver_wallet_id: otherWallet.id,
      created_at: new Date('2024-01-06T10:00:00.000Z'),
      updated_at: new Date('2024-01-06T10:00:00.000Z'),
    });

    await seedTransaction({
      type: 'WITHDRAWAL',
      amount: 400,
      reference: 'TX-SUMMARY-WITHDRAW-1',
      status: 'SUCCESS',
      sender_wallet_id: wallet.id,
      created_at: new Date('2024-01-07T10:00:00.000Z'),
      updated_at: new Date('2024-01-07T10:00:00.000Z'),
    });

    const res = await request(app)
      .get('/api/transactions/summary')
      .set('Authorization', authHeaderForUser(user.id as string));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      credits: {
        total: 2000,
        count: 1,
      },
      debits: {
        total: 1000,
        count: 2,
      },
      netBalance: 1000,
    });
    expect(res.body.data.credits.average).toBeUndefined();
    expect(res.body.data.debits.average).toBeUndefined();
  });
});