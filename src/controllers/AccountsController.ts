import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { paystackService } from "../services/PaystackService";
import { transactionRepository } from "../repositories/TransactionRepository";
import { walletRepository } from "../repositories/WalletRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { userService } from "../services/UserService";
import { userRepository } from "../repositories/UserRepository";
import { comparePassword } from "../utils/password";
import db from "../database/db";
import { ledgerRepository } from "../repositories/LedgerRepository";
import { recipientRepository } from "../repositories/RecipientRepository";
import { logger } from "../config/logger";

export class AccountsController {
  async fundWallet(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const { amount, idempotency_key } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "Unauthorized" });
    }

    if (!idempotency_key) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "idempotency_key is required" });
    }

    const userDetails = await userService.findById(userId);
    if (!userDetails) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found" });
    }

    if (!amount || amount <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid amount" });
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Wallet not found" });
    }

    const existingTx =
      await transactionRepository.findByReference(idempotency_key);
    if (existingTx) {
      if (existingTx.status === "PENDING") {
        logger.info(`Idempotent retry detected for key: ${idempotency_key}`);
        const meta = typeof existingTx.meta === 'string' ? JSON.parse(existingTx.meta) : existingTx.meta;
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Funding initialized successfully",
          data: {
            authorization_url: meta?.authorization_url, // or fetch from Paystack cache
            reference: idempotency_key,
          },
        });
      } else {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: `Transaction already processed with status: ${existingTx.status}`,
        });
      }
    }

    // Create the transaction as PENDING
    const transaction = await transactionRepository.createOrGetByCondition(
      {
        type: "FUND",
        amount,
        currency: "NGN",
        reference: idempotency_key,
        status: "PENDING",
        receiver_wallet_id: wallet.id,
        description: "Wallet Funding via Paystack",
      },
      { reference: idempotency_key },
    );

    if (!transaction) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Failed to create transaction" });
    }

    try {
      // Initialize transaction with Paystack
      const initData = await paystackService.initializeTransaction(
        userDetails.email,
        amount,
        idempotency_key,
      );

      const meta = {
        authorization_url: initData.data.authorization_url,
        access_code: initData.data.access_code,
      };
      await transactionRepository.update(transaction.id as string, {
        meta: JSON.stringify(meta),
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Funding initialized successfully",
        data: {
          authorization_url: initData.data.authorization_url,
          reference: initData.data.reference,
        },
      });
    } catch (error: any) {
      // Mark the transaction as FAILED if Paystack initialization fails
      await transactionRepository.update(transaction.id as string, {
        status: "FAILED",
        description: `Initialization failed: ${error.message}`,
      });
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to initialize wallet funding",
      });
    }
  }

  async withdrawFunds(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { amount, pin, account_number, idempotency_key } = req.body;

      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "Unauthorized" });
      }

      if (!idempotency_key) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "idempotency_key is required" });
      }

      if (
        !amount ||
        amount <= 0 ||
        !pin ||
        !account_number ||
        !idempotency_key
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount, pin, account_number are required",
        });
      }

      // Validate User and PIN
      const user = await userRepository.findById(userId);
      if (!user || !user.pin_hash) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Wallet PIN not set." });
      }

      const isPinValid = await comparePassword(pin, user.pin_hash);
      if (!isPinValid) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "Invalid PIN." });
      }

      // fetch recipient code for the account number and bank code
      const reciepient = await recipientRepository.findOne({
        user_id: userId,
        account_number: account_number,
      });

      if (!reciepient) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Recipient not found for the provided account number.",
        });
      }

      // Fetch Wallet
      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet || wallet.status !== "ACTIVE") {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Active wallet not found." });
      }

      const balance = Number(wallet.balance) || 0;
      if (balance < amount) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Insufficient funds." });
      }

      const existingTx =
        await transactionRepository.findByReference(idempotency_key);
      if (existingTx) {
        if (existingTx.status === "PENDING") {
          logger.info(`Idempotent retry detected for key: ${idempotency_key}`);
          return res.status(StatusCodes.OK).json({
            success: true,
            message: "Withdrawal processing",
          });
        } else {
          return res.status(StatusCodes.OK).json({
            success: true,
            message: `withdrawal already processed with status: ${existingTx.status}`,
          });
        }
      }

      let transactionId: string | undefined;

      // Database Transaction: Deduct funds immediately to prevent double spending
      await db.transaction(async (trx) => {
        // Re-check balance inside the transaction
        const lockedWallet = await walletRepository.lockById(
          wallet.id as string,
          trx,
        );

        if (!lockedWallet || Number(lockedWallet.balance) < amount) {
          throw new Error("Insufficient funds during lock.");
        }

        const balanceBefore = Number(lockedWallet.balance);
        const balanceAfter = balanceBefore - amount;

        // Create Transaction record
        const transaction = await transactionRepository.createOrGetByCondition(
          {
            type: "WITHDRAWAL",
            amount,
            currency: "NGN",
            reference: idempotency_key,
            status: "PENDING",
            sender_wallet_id: wallet.id,
            description: "Wallet Withdrawal to Bank",
          },
          { reference: idempotency_key },
          trx,
        );
        if (!transaction) {
          throw new Error("Failed to create or get transaction");
        }
        transactionId = transaction.id;

        // Create Ledger Entry
        await ledgerRepository.create(
          {
            wallet_id: wallet.id as string,
            transaction_id: transaction.id as string,
            type: "WITHDRAWAL",
            direction: "DEBIT",
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference: `LEDGER-${idempotency_key}`,
          },
          trx,
        );

        // Decrement Wallet Balance
        await walletRepository.decrementBalance(
          wallet.id as string,
          amount,
          trx,
        );
      });

      try {
        // Initiate Transfer
        const transferData = await paystackService.initiateTransfer(
          amount,
          reciepient.bank_code,
          "Wallet Withdrawal",
          idempotency_key,
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Withdrawal initiated successfully",
          data: {
            reference: transferData.data.reference,
            status: transferData.data.status,
          },
        });
      } catch (paystackError: any) {
        // Log the failure for review and reverse the deduction
        if (transactionId) {
          // Mark transaction as FAILED
          await transactionRepository.update(transactionId, {
            status: "FAILED",
            description: `Paystack transfer failed: ${paystackError.message}`,
          });

          // Compensating transaction: reverse the deduction
          await db.transaction(async (trx) => {
            // Lock the wallet for update
            const lockedWallet = await walletRepository.lockById(
              wallet.id as string,
              trx,
            );
            if (lockedWallet) {
              const balanceBefore = Number(lockedWallet.balance);
              const balanceAfter = balanceBefore + amount;

              // Credit the wallet
              await walletRepository.incrementBalance(
                wallet.id as string,
                amount,
                trx,
              );

              // Create a reversal ledger entry
              await ledgerRepository.create(
                {
                  wallet_id: wallet.id as string,
                  transaction_id: transactionId,
                  type: "REVERSAL",
                  direction: "CREDIT",
                  amount,
                  balance_before: balanceBefore,
                  balance_after: balanceAfter,
                  reference: `REVERSAL-${idempotency_key}`,
                },
                trx,
              );
            }
          });
        }
        // Log error for review 
        console.error("Withdrawal Paystack transfer failed:", paystackError);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message:
            paystackError.message || "Withdrawal failed (Paystack error)",
        });
      }
    } catch (error: any) {
      // If DB transaction fails, it rolls back.
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Withdrawal failed",
      });
    }
  }

  async getBanks(req: AuthenticatedRequest, res: Response) {
    try {
      const toBoolean = (value: unknown) => value === 'true' || value === true;

      const banks = await paystackService.getBanks({
        country: (req.query.country as string) || 'nigeria',
        perPage: req.query.perPage ? parseInt(req.query.perPage as string, 10) : 50,
        pageNumber: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        useCursor: toBoolean(req.query.use_cursor),
        payWithBankTransfer: toBoolean(req.query.pay_with_bank_transfer),
        payWithBank: toBoolean(req.query.pay_with_bank),
        enabledForVerification: toBoolean(req.query.enabled_for_verification),
        next: req.query.next as string | undefined,
        previous: req.query.previous as string | undefined,
        gateway: req.query.gateway as string | undefined,
        type: req.query.type as string | undefined,
        currency: req.query.currency as string | undefined,
        includeNipSortCode: toBoolean(req.query.include_nip_sort_code),
      });

      const banksList = Array.isArray(banks.data)
        ? banks.data.map((bank: any) => ({
            id: bank.id,
            name: bank.name,
            code: bank.code,
            slug: bank.slug,
            country: bank.country,
            currency: bank.currency,
            type: bank.type,
            longcode: bank.longcode,
            active: bank.active,
          }))
        : banks.data;

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Banks retrieved successfully",
        data: banksList,
        meta: {
          next: banks.meta?.next,
          previous: banks.meta?.previous,
          per_page: banks.meta?.per_page,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to retrieve banks",
      });
    }
  }

  async bankEnquiry(req: AuthenticatedRequest, res: Response) {
    try {
      const { account_number, bank_code } = req.body;

      if (!account_number || !bank_code) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account number and bank code are required",
        });
      }

      const accountDetails = await paystackService.resolveAccountNumber(
        account_number,
        bank_code,
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Bank enquiry successful",
        data: {
          account_number: accountDetails.data.account_number,
          account_name: accountDetails.data.account_name,
          bank_code: bank_code,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to resolve account details",
      });
    }
  }

  async addRecipient(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { account_number, bank_code } = req.body;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!account_number || !bank_code) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account number and bank code are required",
        });
      }

      //check if account no has already been added as recipient for the user
      const existingRecipient = await recipientRepository.findOne({
        user_id: userId,
        account_number: account_number,
        bank_code: bank_code,
      });

      if (existingRecipient) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Recipient already exists",
        });
      }

      const bankEnquiry = await paystackService.resolveAccountNumber(
        account_number,
        bank_code,
      );

      const account_name = bankEnquiry.data.account_name;
      console.log('Bank enquiry result for addRecipient:', bankEnquiry);

      const recipient = await paystackService.createTransferRecipient(
        account_name,
        account_number,
        bank_code,
      );

      //TODO: Save the recipient to the database
      await recipientRepository.create({
        user_id: userId,
        recipient_code: recipient.recipient_code,
        account_number: recipient.account_number,
        bank_code: bank_code,
        account_name: recipient.account_name,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Recipient added successfully",
        data: {
          recipient,
          account_name,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to add recipient",
      });
    }
  }

  async getRecipients(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const recipients = await recipientRepository.findAllByCondition({
        user_id: userId,
      });
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Recipients fetched successfully",
        data: recipients,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to fetch recipients",
      });
    }
  }

  async walletToWalletTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { amount, receiver_wallet_id, pin, idempotency_key } = req.body;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!idempotency_key) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "idempotency_key is required" });
      }

      const existingTx =
        await transactionRepository.findByReference(idempotency_key);
      if (existingTx) {
        if (existingTx.status === "PENDING") {
          logger.info(`Idempotent retry detected for key: ${idempotency_key}`);
          return res.status(StatusCodes.OK).json({
            success: true,
            message: "Wallet-to-wallet transfer processing",
          });
        } else {
          return res.status(StatusCodes.OK).json({
            success: true,
            message: `Wallet-to-wallet transfer already processed with status: ${existingTx.status}`,
          });
        }
      }

      const user = await userRepository.findById(userId);
      if (!user || !user.pin_hash) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Wallet PIN not set.",
        });
      }

      if (!amount || amount <= 0 || !receiver_wallet_id || !pin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount, recipient wallet id, and pin are required",
        });
      }

      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet || wallet.status !== "ACTIVE") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Active wallet not found.",
        });
      }

      const balance = Number(wallet.balance) || 0;
      if (balance < amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Insufficient funds.",
        });
      }

      const isPinValid = await comparePassword(pin, user.pin_hash as string);
      if (!isPinValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Invalid PIN.",
        });
      }

      const recipientWallet =
        await walletRepository.findById(receiver_wallet_id);
      if (!recipientWallet || recipientWallet.status !== "ACTIVE") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Recipient wallet not found or inactive.",
        });
      }

      await db.transaction(async (trx) => {
        // Lock sender wallet
        const lockedSenderWallet = await walletRepository.lockById(
          wallet.id as string,
          trx,
        );
        if (
          !lockedSenderWallet ||
          Number(lockedSenderWallet.balance) < amount
        ) {
          throw new Error("Insufficient funds during lock.");
        }

        // Lock recipient wallet
        const lockedRecipientWallet = await walletRepository.lockById(
          receiver_wallet_id,
          trx,
        );
        if (!lockedRecipientWallet) {
          throw new Error("Recipient wallet not found during lock.");
        }

        // Deduct from sender
        const balanceBeforeSender = Number(lockedSenderWallet.balance);
        const balanceAfterSender = balanceBeforeSender - amount;
        await walletRepository.decrementBalance(
          wallet.id as string,
          amount,
          trx,
        );

        // Create transaction (sender)
        const transaction = await transactionRepository.createOrGetByCondition(
          {
            type: "TRANSFER",
            amount,
            currency: "NGN",
            reference: idempotency_key,
            status: "SUCCESS",
            sender_wallet_id: wallet.id,
            receiver_wallet_id: receiver_wallet_id,
            description: "Wallet to Wallet Transfer",
          },
          { reference: idempotency_key },
          trx,
        );
        if (!transaction) {
          throw new Error("Failed to create or get transaction");
        }

        // Create ledger entry (sender)
        await ledgerRepository.create(
          {
            wallet_id: wallet.id as string,
            transaction_id: transaction.id as string,
            type: "TRANSFER",
            direction: "DEBIT",
            amount,
            balance_before: balanceBeforeSender,
            balance_after: balanceAfterSender,
            reference: `LEDGER-DEBIT-${idempotency_key}`,
          },
          trx,
        );

        // Add to recipient
        const balanceBeforeRecipient = Number(lockedRecipientWallet.balance);
        const balanceAfterRecipient = balanceBeforeRecipient + amount;
        await walletRepository.incrementBalance(
          receiver_wallet_id,
          amount,
          trx,
        );

        // Create ledger entry (recipient)
        await ledgerRepository.create(
          {
            wallet_id: receiver_wallet_id,
            transaction_id: transaction.id,
            type: "TRANSFER",
            direction: "CREDIT",
            amount,
            balance_before: balanceBeforeRecipient,
            balance_after: balanceAfterRecipient,
            reference: `LEDGER-CREDIT-${idempotency_key}`,
          },
          trx,
        );
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Wallet to wallet transfer successful",
        data: {
          reference: idempotency_key,
          amount,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Wallet to wallet transfer failed",
      });
    }
  }
}

export const accountsController = new AccountsController();
