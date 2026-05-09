import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';
import { paystackService } from '../services/PaystackService';
import { transactionRepository } from '../repositories/TransactionRepository';
import { walletRepository } from '../repositories/WalletRepository';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { userService } from '@/services/UserService';
import { userRepository } from '@/repositories/UserRepository';
import { comparePassword } from '@/utils/password';
import db from '@/database/db';
import { ledgerRepository } from '@/repositories/LedgerRepository';
import { recepientRepository } from '@/repositories/RecepientRepository';

export class AccountsController {

  async fundWallet(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const { amount } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    }

    const userDetails = await userService.findById(userId)
    if (!userDetails) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'User not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid amount' });
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Wallet not found' });
    }

    const reference = `DC-${uuidv4()}`;

    // Create the transaction as PENDING
    const transaction = await transactionRepository.create({
      type: 'FUND',
      amount,
      currency: 'NGN',
      reference,
      status: 'PENDING',
      receiver_wallet_id: wallet.id,
      description: 'Wallet Funding via Paystack',
    });

    try {
      // Initialize transaction with Paystack
      const initData = await paystackService.initializeTransaction(
        userDetails.email,
        amount,
        reference
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Funding initialized successfully',
        data: {
          authorization_url: initData.data.authorization_url,
          reference: initData.data.reference,
        },
      });
    } catch (error: any) {
      // Mark the transaction as FAILED if Paystack initialization fails
      await transactionRepository.update(transaction.id as string, { status: 'FAILED', description: `Initialization failed: ${error.message}` });
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to initialize wallet funding',
      });
    }
  }

  async withdrawFunds(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { amount, pin, recipient_code } = req.body;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
      }

      if (!amount || amount <= 0 || !pin || !recipient_code) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Amount, pin, account_number, bank_code, and account_name are required'
        });
      }

      // 1. Validate User and PIN
      const user = await userRepository.findById(userId);
      if (!user || !user.pin_hash) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Wallet PIN not set.' });
      }

      const isPinValid = await comparePassword(pin, user.pin_hash);
      if (!isPinValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Invalid PIN.' });
      }

      // 2. Fetch Wallet
      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet || wallet.status !== 'ACTIVE') {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Active wallet not found.' });
      }

      const balance = Number(wallet.balance) || 0;
      if (balance < amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Insufficient funds.' });
      }

      const reference = `DC-${uuidv4()}`;
      let transactionId: string | undefined;

      // 3. Database Transaction: Deduct funds immediately to prevent double spending
      await db.transaction(async (trx) => {
        // A. Re-check balance inside the transaction (if using row locks, we'd lock here)
        const lockedWallet = await walletRepository.lockById(wallet.id as string, trx);

        if (!lockedWallet || Number(lockedWallet.balance) < amount) {
          throw new Error('Insufficient funds during lock.');
        }

        const balanceBefore = Number(lockedWallet.balance);
        const balanceAfter = balanceBefore - amount;

        // B. Create Transaction record
        const transaction = await transactionRepository.create({
          type: 'WITHDRAWAL',
          amount,
          currency: 'NGN',
          reference,
          status: 'PENDING',
          sender_wallet_id: wallet.id,
          description: 'Wallet Withdrawal to Bank',
        }, trx);
        transactionId = transaction.id as string;

        // C. Create Ledger Entry
        await ledgerRepository.create({
          wallet_id: wallet.id as string,
          transaction_id: transaction.id as string,
          type: 'WITHDRAWAL',
          direction: 'DEBIT',
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: `LEDGER-${reference}`,
        }, trx);

        // D. Decrement Wallet Balance
        await walletRepository.decrementBalance(wallet.id as string, amount, trx);
      });

      try {
        // Initiate Transfer
        const transferData = await paystackService.initiateTransfer(
          amount,
          recipient_code,
          'Wallet Withdrawal',
          reference
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Withdrawal initiated successfully',
          data: {
            reference: transferData.data.reference,
            status: transferData.data.status,
          },
        });
      } catch (paystackError: any) {
        // Log the failure for admin review and reverse the deduction
        if (transactionId) {
          // Mark transaction as FAILED
          await transactionRepository.update(transactionId, {
            status: 'FAILED',
            description: `Paystack transfer failed: ${paystackError.message}`
          });

          // Compensating transaction: reverse the deduction
          await db.transaction(async (trx) => {
            // Lock the wallet for update
            const lockedWallet = await walletRepository.lockById(wallet.id as string, trx);
            if (lockedWallet) {
              const balanceBefore = Number(lockedWallet.balance);
              const balanceAfter = balanceBefore + amount;

              // Credit the wallet
              await walletRepository.incrementBalance(wallet.id as string, amount, trx);

              // Create a reversal ledger entry
              await ledgerRepository.create({
                wallet_id: wallet.id as string,
                transaction_id: transactionId,
                type: 'REVERSAL',
                direction: 'CREDIT',
                amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference: `REVERSAL-${reference}`,
              }, trx);
            }
          });
        }
        // Log error for admin review (could use a logger or error tracking service)
        console.error('Withdrawal Paystack transfer failed:', paystackError);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: paystackError.message || 'Withdrawal failed (Paystack error)',
        });
      }
    } catch (error: any) {
      // If DB transaction fails, it rolls back.
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Withdrawal failed',
      });
    }
  }

  async addRecipient(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { account_number, bank_code, account_name } = req.body;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!account_number || !bank_code || !account_name) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Account number, bank code, and account name are required',
        });
      }

      const recipient = await paystackService.createTransferRecipient(
        account_name,
        account_number,
        bank_code
      );

      //TODO: Save the recipient to the database
      await recepientRepository.create({
        user_id: userId,
        recipient_code: recipient.recipient_code,
        account_number: recipient.account_number,
        bank_code: recipient.bank_code,
        account_name: recipient.account_name,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Recipient added successfully',
        data: recipient,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to add recipient',
      });
    }
  }

  async getReciepients(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const recepients = await recepientRepository.findAll({ user_id: userId });
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Recipients fetched successfully',
        data: recepients,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to fetch recipients',
      });
    }
  }

  async walletToWalletTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { amount, receiver_wallet_id, pin } = req.body;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await userRepository.findById(userId);
      if (!user || !user.pin_hash) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Wallet PIN not set.',
        });
      }

      if (!amount || amount <= 0 || !receiver_wallet_id || !pin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Amount, recipient wallet id, and pin are required',
        });
      }

      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet || wallet.status !== 'ACTIVE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Active wallet not found.',
        });
      }

      const balance = Number(wallet.balance) || 0;
      if (balance < amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Insufficient funds.',
        });
      }

      const isPinValid = await comparePassword(pin, user.pin_hash as string);
      if (!isPinValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid PIN.',
        });
      }

      const recipientWallet = await walletRepository.findById(receiver_wallet_id);
      if (!recipientWallet || recipientWallet.status !== 'ACTIVE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Recipient wallet not found or inactive.',
        });
      }

      const reference = `DC-${uuidv4()}`;

      await db.transaction(async (trx) => {
        // A. Lock sender wallet
        const lockedSenderWallet = await walletRepository.lockById(wallet.id as string, trx);
        if (!lockedSenderWallet || Number(lockedSenderWallet.balance) < amount) {
          throw new Error('Insufficient funds during lock.');
        }

        // B. Lock recipient wallet
        const lockedRecipientWallet = await walletRepository.lockById(receiver_wallet_id, trx);
        if (!lockedRecipientWallet) {
          throw new Error('Recipient wallet not found during lock.');
        }

        // C. Deduct from sender
        const balanceBeforeSender = Number(lockedSenderWallet.balance);
        const balanceAfterSender = balanceBeforeSender - amount;
        await walletRepository.decrementBalance(wallet.id as string, amount, trx);

        // D. Create transaction (sender)
        const transaction = await transactionRepository.create({
          type: 'TRANSFER',
          amount,
          currency: 'NGN',
          reference,
          status: 'SUCCESS',
          sender_wallet_id: wallet.id,
          receiver_wallet_id: receiver_wallet_id,
          description: 'Wallet to Wallet Transfer',
        }, trx);

        // E. Create ledger entry (sender)
        await ledgerRepository.create({
          wallet_id: wallet.id as string,
          transaction_id: transaction.id as string,
          type: 'TRANSFER',
          direction: 'DEBIT',
          amount,
          balance_before: balanceBeforeSender,
          balance_after: balanceAfterSender,
          reference: `LEDGER-${reference}`,
        }, trx);

        // F. Add to recipient
        const balanceBeforeRecipient = Number(lockedRecipientWallet.balance);
        const balanceAfterRecipient = balanceBeforeRecipient + amount;
        await walletRepository.incrementBalance(receiver_wallet_id, amount, trx);

        // G. Create ledger entry (recipient)
        await ledgerRepository.create({
          wallet_id: receiver_wallet_id,
          transaction_id: transaction.id,
          type: 'TRANSFER',
          direction: 'CREDIT',
          amount,
          balance_before: balanceBeforeRecipient,
          balance_after: balanceAfterRecipient,
          reference: `LEDGER-${reference}`,
        }, trx);
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Wallet to wallet transfer successful',
        data: {
          reference,
          amount,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Wallet to wallet transfer failed',
      });
    }
  }
}

export const accountsController = new AccountsController();
