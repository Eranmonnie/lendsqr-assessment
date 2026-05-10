import crypto from 'crypto';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { describe, expect, it } from '@jest/globals';
import app from '../src/app';
import db from '../src/database/db';
import { createUser, createWallet } from './helpers/factories';
import { env } from '../src/config/env';

const signPayload = (payload: Record<string, unknown>) =>
  crypto.createHmac('sha512', env.paystack.secretKey).update(JSON.stringify(payload)).digest('hex');

describe('Paystack Webhook Handling', () => {
  it('processes charge.success and updates wallet, ledger and transaction', async () => {
    const user = await createUser({ email: 'webhook-charge@example.com' });
    const wallet = await createWallet(user.id as string, { balance: 1000, status: 'ACTIVE' });

    await db('transactions').insert({
      id: randomUUID(),
      type: 'FUND',
      amount: 500,
      currency: 'NGN',
      reference: 'DC-WEBHOOK-FUND-1',
      status: 'PENDING',
      receiver_wallet_id: wallet.id,
      description: 'Wallet Funding via Paystack',
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'DC-WEBHOOK-FUND-1',
        amount: 50000,
      },
    };

    const res = await request(app)
      .post('/api/paystack/webhook')
      .set('x-paystack-signature', signPayload(payload))
      .send(payload);

    expect(res.status).toBe(200);
    const updatedWallet = await db('wallets').where({ id: wallet.id }).first('*');
    expect(Number(updatedWallet.balance)).toBe(1500);

    const tx = await db('transactions').where({ reference: 'DC-WEBHOOK-FUND-1' }).first('*');
    expect(tx.status).toBe('SUCCESS');

    const ledger = await db('ledger_entries').where({ transaction_id: tx.id }).first('*');
    expect(ledger).toBeDefined();

    const webhook = await db('webhooks').where({ reference: 'DC-WEBHOOK-FUND-1' }).first('*');
    expect(webhook.status).toBe('SUCCESS');
  });

  it('processes transfer.failed and reverses sender funds', async () => {
    const user = await createUser({ email: 'webhook-failed-transfer@example.com' });
    const wallet = await createWallet(user.id as string, { balance: 2000, status: 'ACTIVE' });

    await db('transactions').insert({
      id: randomUUID(),
      type: 'WITHDRAWAL',
      amount: 500,
      currency: 'NGN',
      reference: 'DC-WEBHOOK-WITHDRAW-1',
      status: 'PENDING',
      sender_wallet_id: wallet.id,
      description: 'Wallet Withdrawal to Bank',
    });

    const payload = {
      event: 'transfer.failed',
      data: {
        reference: 'DC-WEBHOOK-WITHDRAW-1',
        amount: 50000,
      },
    };

    const res = await request(app)
      .post('/api/paystack/webhook')
      .set('x-paystack-signature', signPayload(payload))
      .send(payload);

    expect(res.status).toBe(200);
    const updatedWallet = await db('wallets').where({ id: wallet.id }).first('*');
    expect(Number(updatedWallet.balance)).toBe(2500);

    const tx = await db('transactions').where({ reference: 'DC-WEBHOOK-WITHDRAW-1' }).first('*');
    expect(tx.status).toBe('FAILED');

    const reversalLedger = await db('ledger_entries').where({ type: 'REVERSAL' }).first('*');
    expect(reversalLedger).toBeDefined();
  });
});
