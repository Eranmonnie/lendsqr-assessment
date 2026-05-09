import request from 'supertest';
import app from '../src/app';
import db from '../src/database/db';
import { authHeaderForUser, createUser, createWallet, setUserPin } from './helpers/factories';
import {
  mockPaystackInitializeFailure,
  mockPaystackInitializeSuccess,
  mockPaystackTransferFailure,
  mockPaystackTransferSuccess,
} from './mocks/paystack';

describe('AccountsController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initiates funding successfully', async () => {
    const user = await createUser({ email: 'fund-success@example.com' });
    await createWallet(user.id as string, { balance: 0 });
    mockPaystackInitializeSuccess();

    const res = await request(app)
      .post('/api/accounts/fund')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 5000, idempotency_key: 'fund-success-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authorization_url).toBeDefined();
  });

  it('marks funding transaction failed if Paystack init fails', async () => {
    const user = await createUser({ email: 'fund-fail@example.com' });
    await createWallet(user.id as string, { balance: 0 });
    mockPaystackInitializeFailure('paystack down');

    const res = await request(app)
      .post('/api/accounts/fund')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 3000, idempotency_key: 'fund-fail-001' });

    expect(res.status).toBe(500);
    const transaction = await db('transactions').first('*');
    expect(transaction).toBeDefined();
    expect(transaction.status).toBe('FAILED');
  });

  it('withdraws successfully with valid PIN and sufficient balance', async () => {
    const user = await createUser({ email: 'withdraw-ok@example.com' });
    await setUserPin(user.id as string, '1234');
    await createWallet(user.id as string, { balance: 10000 });
    mockPaystackTransferSuccess();

    // Create a recipient for the user
    await db('recipients').insert({
      id: require('crypto').randomUUID(),
      user_id: user.id,
      account_number: '0123456789',
      bank_code: '058',
      account_name: 'Test Account',
      recipient_code: 'RCP_test_1',
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockPaystackTransferSuccess();

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 2000, pin: '1234', account_number: '0123456789', idempotency_key: 'withdraw-ok-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('fails withdrawal on insufficient funds', async () => {
    const user = await createUser({ email: 'withdraw-insufficient@example.com' });
    await setUserPin(user.id as string, '1234');
    await createWallet(user.id as string, { balance: 100 });

    // Create a recipient for the user
    await db('recipients').insert({
      id: require('crypto').randomUUID(),
      user_id: user.id,
      account_number: '9876543210',
      bank_code: '058',
      account_name: 'Test Account',
      recipient_code: 'RCP_test_2',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 500, pin: '1234', account_number: '9876543210', idempotency_key: 'withdraw-insufficient-001' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient funds/i);
  });

  it('reverses wallet balance and adds reversal ledger if transfer API fails', async () => {
    const user = await createUser({ email: 'withdraw-reverse@example.com' });
    await setUserPin(user.id as string, '1234');
    const wallet = await createWallet(user.id as string, { balance: 10000 });
    // Create a recipient for the user
    await db('recipients').insert({
      id: require('crypto').randomUUID(),
      user_id: user.id,
      account_number: '5555555555',
      bank_code: '058',
      account_name: 'Test Account',
      recipient_code: 'RCP_test_3',
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockPaystackTransferFailure('transfer downstream failure');

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 2500, pin: '1234', account_number: '5555555555', idempotency_key: 'withdraw-reverse-001' });

    expect(res.status).toBe(500);
    const updatedWallet = await db('wallets').where({ id: wallet.id }).first('*');
    expect(Number(updatedWallet.balance)).toBe(10000);

    const failedTx = await db('transactions').where({ type: 'WITHDRAWAL' }).first('*');
    expect(failedTx.status).toBe('FAILED');
    const reversalLedger = await db('ledger_entries').where({ type: 'REVERSAL' }).first('*');
    expect(reversalLedger).toBeDefined();
  });

  it('transfers wallet-to-wallet successfully', async () => {
    const sender = await createUser({ email: 'sender@example.com' });
    const receiver = await createUser({ email: 'receiver@example.com' });
    await setUserPin(sender.id as string, '1234');
    const senderWallet = await createWallet(sender.id as string, { balance: 5000, status: 'ACTIVE' });
    const receiverWallet = await createWallet(receiver.id as string, { balance: 1000, status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/accounts/transfer')
      .set('Authorization', authHeaderForUser(sender.id as string))
      .send({ amount: 1500, receiver_wallet_id: receiverWallet.id, pin: '1234', idempotency_key: 'transfer-success-001' });

    expect(res.status).toBe(200);
    const senderRow = await db('wallets').where({ id: senderWallet.id }).first('*');
    const receiverRow = await db('wallets').where({ id: receiverWallet.id }).first('*');
    expect(Number(senderRow.balance)).toBe(3500);
    expect(Number(receiverRow.balance)).toBe(2500);
  });

  it('fails wallet-to-wallet transfer for insufficient sender funds', async () => {
    const sender = await createUser({ email: 'sender-low@example.com' });
    const receiver = await createUser({ email: 'receiver-low@example.com' });
    await setUserPin(sender.id as string, '1234');
    await createWallet(sender.id as string, { balance: 100, status: 'ACTIVE' });
    const receiverWallet = await createWallet(receiver.id as string, { balance: 0, status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/accounts/transfer')
      .set('Authorization', authHeaderForUser(sender.id as string))
      .send({ amount: 500, receiver_wallet_id: receiverWallet.id, pin: '1234', idempotency_key: 'transfer-insufficient-001' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient funds/i);
  });

  it('fails wallet-to-wallet transfer for inactive recipient wallet', async () => {
    const sender = await createUser({ email: 'sender-active@example.com' });
    const receiver = await createUser({ email: 'receiver-inactive@example.com' });
    await setUserPin(sender.id as string, '1234');
    await createWallet(sender.id as string, { balance: 3000, status: 'ACTIVE' });
    const receiverWallet = await createWallet(receiver.id as string, { balance: 0, status: 'FROZEN' });

    const res = await request(app)
      .post('/api/accounts/transfer')
      .set('Authorization', authHeaderForUser(sender.id as string))
      .send({ amount: 300, receiver_wallet_id: receiverWallet.id, pin: '1234', idempotency_key: 'transfer-inactive-001' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive/i);
  });

  it('retrieves wallet details successfully via wallet enquiry', async () => {
    const user = await createUser({ email: 'enquiry-sender@example.com' });
    const receiver = await createUser({ email: 'enquiry-receiver@example.com' });
    const receiverWallet = await createWallet(receiver.id as string, { balance: 2500, status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/accounts/wallet-enquiry')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ receiver_wallet_id: receiverWallet.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(receiverWallet.id);
    expect(res.body.data.balance).toBe(2500);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.currency).toBeDefined();
  });

  it('fails wallet enquiry for non-existent wallet', async () => {
    const user = await createUser({ email: 'enquiry-notfound@example.com' });
    const fakeWalletId = require('crypto').randomUUID();

    const res = await request(app)
      .post('/api/accounts/wallet-enquiry')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ receiver_wallet_id: fakeWalletId });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/wallet not found/i);
  });

  it('fails wallet enquiry for inactive wallet', async () => {
    const user = await createUser({ email: 'enquiry-inactive@example.com' });
    const receiver = await createUser({ email: 'enquiry-frozen@example.com' });
    const receiverWallet = await createWallet(receiver.id as string, { balance: 1000, status: 'FROZEN' });

    const res = await request(app)
      .post('/api/accounts/wallet-enquiry')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ receiver_wallet_id: receiverWallet.id });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not active/i);
  });

  it('fails wallet enquiry with missing receiver_wallet_id', async () => {
    const user = await createUser({ email: 'enquiry-missing@example.com' });

    const res = await request(app)
      .post('/api/accounts/wallet-enquiry')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required/i);
  });
});
