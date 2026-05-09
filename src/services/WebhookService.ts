import db from '../database/db';
import { walletRepository } from '../repositories/WalletRepository';
import { ledgerRepository } from '@/repositories/LedgerRepository';
import { transactionRepository } from '@/repositories/TransactionRepository';
import { logger } from '@/config/logger';
import { webhookRepository } from '@/repositories/WebhookRepository';

export class WebhookService {

    async handlePaystackChargeSuccess(event: any) {
        const { reference, amount: amountInKobo } = event.data;
        const amountInNaira = amountInKobo / 100;

        // 3. Get the pending transaction
        const transaction = await transactionRepository.findByReference(reference);

        if (!transaction || transaction.status !== 'PENDING') {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // 4. Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {


            // B. Get the receiver wallet with a lock (simulated via atomic increment here or row lock)
            const wallet = await walletRepository.lockById(transaction.receiver_wallet_id as string, trx);
            if (!wallet) throw new Error('Wallet not found for transaction');

            const balanceBefore = Number(wallet.balance) || 0;
            const balanceAfter = balanceBefore + amountInNaira;

            // D. Atomically Increment the wallet balance
            await walletRepository.incrementBalance(wallet.id as string, amountInNaira, trx);

            // C. Create a Ledger Entry
            await ledgerRepository.create({
                wallet_id: wallet.id as string,
                transaction_id: transaction.id as string,
                type: 'FUND',
                direction: 'CREDIT',
                amount: amountInNaira,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference: `LEDGER-${reference}`,
            }, trx);

            // A. Mark transaction as SUCCESS
            await transactionRepository.update(transaction.id as string, { status: 'SUCCESS' }, trx);

            // E. Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }

    async handlePaystackTransferSuccess(event: any) {
        const { reference } = event.data;
        // 3. Get the pending transaction
        const transaction = await transactionRepository.findByCondition({ reference, status: 'PENDING' });

        if (!transaction) {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // 4. Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {
            // A. Mark transaction as SUCCESS
            await transactionRepository.update(transaction.id as string, { status: 'SUCCESS' }, trx);

            // E. Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }

    async handlePaystackTransferFailed(event: any) {
        const { reference, amount: amountInKobo } = event.data;
        const amountInNaira = amountInKobo / 100;

        // 3. Get the pending transaction
        const transaction = await transactionRepository.findByCondition({ reference, status: 'PENDING' });

        if (!transaction) {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // 4. Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {

            // B. Get the receiver wallet with a lock (simulated via atomic increment here or row lock)
            const wallet = await walletRepository.lockById(transaction.sender_wallet_id as string, trx);
            if (!wallet) throw new Error('Wallet not found for transaction');

            const balanceBefore = Number(wallet.balance) || 0;
            const balanceAfter = balanceBefore + amountInNaira;

            // C. Create a Ledger Entry
            await ledgerRepository.create({
                wallet_id: wallet.id as string,
                transaction_id: transaction.id as string,
                type: 'REVERSAL',
                direction: 'CREDIT',
                amount: amountInNaira,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference: `LEDGER-${reference}`,
            }, trx);
            // D. Atomically Increment the wallet balance
            await walletRepository.incrementBalance(wallet.id as string, amountInNaira, trx);

            // A. Mark transaction as SUCCESS
            await transactionRepository.update(transaction.id as string, { status: 'FAILED' }, trx);

            // E. Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }
}

export const webhookService = new WebhookService();
