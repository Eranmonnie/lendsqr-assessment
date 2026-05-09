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
      .send({ amount: 5000 });

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
      .send({ amount: 3000 });

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

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 2000, pin: '1234', recipient_code: 'RCP_test_1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('fails withdrawal on insufficient funds', async () => {
    const user = await createUser({ email: 'withdraw-insufficient@example.com' });
    await setUserPin(user.id as string, '1234');
    await createWallet(user.id as string, { balance: 100 });

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 500, pin: '1234', recipient_code: 'RCP_test_2' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient funds/i);
  });

  it('reverses wallet balance and adds reversal ledger if transfer API fails', async () => {
    const user = await createUser({ email: 'withdraw-reverse@example.com' });
    await setUserPin(user.id as string, '1234');
    const wallet = await createWallet(user.id as string, { balance: 10000 });
    mockPaystackTransferFailure('transfer downstream failure');

    const res = await request(app)
      .post('/api/accounts/withdraw')
      .set('Authorization', authHeaderForUser(user.id as string))
      .send({ amount: 2500, pin: '1234', recipient_code: 'RCP_test_3' });

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
      .send({ amount: 1500, receiver_wallet_id: receiverWallet.id, pin: '1234' });

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
      .send({ amount: 500, receiver_wallet_id: receiverWallet.id, pin: '1234' });

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
      .send({ amount: 300, receiver_wallet_id: receiverWallet.id, pin: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive/i);
  });
});
