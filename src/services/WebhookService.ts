import db from '../database/db';
import { walletRepository } from '../repositories/WalletRepository';
import { ledgerRepository } from '../repositories/LedgerRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { logger } from '../config/logger';
import { webhookRepository } from '../repositories/WebhookRepository';

export class WebhookService {

    /**
     * Handles a successful Paystack charge webhook event.
     * @param event any (Paystack webhook payload)
     * @returns Promise<void> (processes the webhook side effects)
     * @throws Error if the transaction update fails
     */
    async handlePaystackChargeSuccess(event: any) {
        const { reference, amount: amountInKobo } = event.data;
        const amountInNaira = amountInKobo / 100;

        // Get the pending transaction
        const transaction = await transactionRepository.findByReference(reference);

        if (!transaction || transaction.status !== 'PENDING') {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {


            // Get the receiver wallet with a lock (simulated via atomic increment here or row lock)
            const wallet = await walletRepository.lockById(transaction.receiver_wallet_id as string, trx);
            if (!wallet) throw new Error('Wallet not found for transaction');

            const balanceBefore = Number(wallet.balance) || 0;
            const balanceAfter = balanceBefore + amountInNaira;

            // Atomically Increment the wallet balance
            await walletRepository.incrementBalance(wallet.id as string, amountInNaira, trx);

            // Create a Ledger Entry
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

            // Mark transaction as SUCCESS
            await transactionRepository.update(transaction.id as string, { status: 'SUCCESS' }, trx);

            // Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }

    /**
     * Handles a successful Paystack transfer webhook event.
     * @param event any (Paystack webhook payload)
     * @returns Promise<void> (processes the webhook side effects)
     * @throws Error if the transaction update fails
     */
    async handlePaystackTransferSuccess(event: any) {
        const { reference } = event.data;
        // Get the pending transaction
        const transaction = await transactionRepository.findByCondition({ reference, status: 'PENDING' });

        if (!transaction) {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {
            // Mark transaction as SUCCESS
            await transactionRepository.update(transaction.id as string, { status: 'SUCCESS' }, trx);

            // Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }

    /**
     * Handles a failed Paystack transfer webhook event.
     * @param event any (Paystack webhook payload)
     * @returns Promise<void> (processes the webhook side effects)
     * @throws Error if the transaction update fails
     */
    async handlePaystackTransferFailed(event: any) {
        const { reference, amount: amountInKobo } = event.data;
        const amountInNaira = amountInKobo / 100;

        // Get the pending transaction
        const transaction = await transactionRepository.findByCondition({ reference, status: 'PENDING' });

        if (!transaction) {
            logger.warn(`Transaction ${reference} not found or already processed. skipping `);
            return;
        }

        // Start a DB transaction to safely update everything
        await db.transaction(async (trx) => {

            // Get the receiver wallet with a lock (simulated via atomic increment here or row lock)
            const wallet = await walletRepository.lockById(transaction.sender_wallet_id as string, trx);
            if (!wallet) throw new Error('Wallet not found for transaction');

            const balanceBefore = Number(wallet.balance) || 0;
            const balanceAfter = balanceBefore + amountInNaira;

            // Create a Ledger Entry
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
            // Atomically Increment the wallet balance
            await walletRepository.incrementBalance(wallet.id as string, amountInNaira, trx);

            // Mark transaction as FAILED
            await transactionRepository.update(transaction.id as string, { status: 'FAILED' }, trx);

            // Mark webhook as completed
            await webhookRepository.updateByReference(reference, { status: 'SUCCESS' }, trx);
        });
    }
}

export const webhookService = new WebhookService();
