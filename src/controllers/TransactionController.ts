import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { transactionRepository, TransactionWithClassification } from "../repositories/TransactionRepository";
import { walletRepository } from "../repositories/WalletRepository";
import { userRepository } from "../repositories/UserRepository";
import { logger } from "../config/logger";

export class TransactionController {
  /**
  * Gets the authenticated user's transactions with credit/debit classification.
  * @param req AuthenticatedRequest (query parameters: type, status, limit, offset)
  * @param res Response (HTTP response object)
  * @returns Promise<any> (transactions response)
  * @throws Error if the transaction lookup fails
   */
  async getMyTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "Unauthorized" });
      }

      const { type = "ALL", status, limit = 10, offset = 0 } = req.query;

      // Find user's wallet
      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Wallet not found" });
      }

      // Build filters
      const filters: any = {
        limit: Math.min(Number(limit), 100),
        offset: Math.max(Number(offset), 0),
      };

      if (status && ["PENDING", "SUCCESS", "FAILED"].includes(String(status))) {
        filters.status = status;
      }

      // Fetch transactions
      const transactions = await transactionRepository.findByWalletId(
        wallet.id!,
        filters,
      );

      // Get total count for pagination
      const totalCount = await transactionRepository.countByWalletId(
        wallet.id!,
        {
          status: filters.status,
        },
      );

      // Classify transactions and add metadata
      const classified = await Promise.all(
        transactions.map((tx) => this.classifyTransaction(tx, wallet.id!)),
      );

      // Filter by type if requested
      let filtered = classified;
      if (type !== "ALL") {
        filtered = classified.filter((tx) => tx.classification === type);
      }

      logger.info(`Fetched ${filtered.length} transactions for user ${userId}`);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: {
          transactions: filtered,
          pagination: {
            limit: filters.limit,
            offset: filters.offset,
            total: totalCount,
            hasMore: filters.offset + filtered.length < totalCount,
          },
        },
      });
    } catch (error: any) {
      logger.error(`Error fetching transactions: ${error.message}`);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: error.message || "Failed to fetch transactions",
        });
    }
  }

  /**
    * Gets a single transaction by ID with full details.
    * @param req AuthenticatedRequest (transaction ID param)
    * @param res Response (HTTP response object)
    * @returns Promise<any> (transaction detail response)
    * @throws Error if the transaction lookup fails
   */
  async getTransactionById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const transactionId = req.params.transactionId as string;

      if (!transactionId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Transaction ID is required" });
      }

      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "Unauthorized" });
      }

      const transaction = await transactionRepository.findById(transactionId);
      if (!transaction) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Transaction not found" });
      }

      // Verify user owns this transaction
      const wallet = await walletRepository.findByUserId(userId);
      if (
        !wallet ||
        (transaction.sender_wallet_id !== wallet.id &&
          transaction.receiver_wallet_id !== wallet.id)
      ) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({
            success: false,
            message: "You do not have access to this transaction",
          });
      }

      const classified = await this.classifyTransaction(
        transaction,
        wallet.id!,
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction retrieved successfully",
        data: classified,
      });
    } catch (error: any) {
      logger.error(`Error fetching transaction: ${error.message}`);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: error.message || "Failed to fetch transaction",
        });
    }
  }

  /**
    * Gets a summary of the authenticated user's transactions.
    * @param req AuthenticatedRequest (current request context)
    * @param res Response (HTTP response object)
    * @returns Promise<any> (transaction summary response)
    * @throws Error if the summary lookup fails
   */
  async getTransactionSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "Unauthorized" });
      }

      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Wallet not found" });
      }

      // Get all successful transactions
      const allTransactions = await transactionRepository.findByWalletId(
        wallet.id!,
        { status: "SUCCESS", limit: 1000, offset: 0 },
      );

      let totalCredits = 0;
      let totalDebits = 0;
      let creditCount = 0;
      let debitCount = 0;

      for (const tx of allTransactions) {
        const classified = await this.classifyTransaction(tx, wallet.id!);
        if (classified.classification === "CREDIT") {
          totalCredits += Number(tx.amount);
          creditCount++;
        } else {
          totalDebits += Number(tx.amount);
          debitCount++;
        }
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction summary retrieved successfully",
        data: {
          credits: {
            total: totalCredits,
            count: creditCount,
          },
          debits: {
            total: totalDebits,
            count: debitCount,
          },
          netBalance: totalCredits - totalDebits,
        },
      });
    } catch (error: any) {
      logger.error(`Error fetching transaction summary: ${error.message}`);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: error.message || "Failed to fetch transaction summary",
        });
    }
  }

  /**
   * Classifies a transaction as CREDIT or DEBIT from the user's perspective.
   * @param transaction any (transaction record)
   * @param userWalletId string (current user's wallet ID)
   * @returns Promise<TransactionWithClassification> (classified transaction)
   * @throws Error if counterparty lookup fails
   */
  private async classifyTransaction(
    transaction: any,
    userWalletId: string,
  ): Promise<TransactionWithClassification> {
    let classification: "CREDIT" | "DEBIT";
    let direction: "SENT" | "RECEIVED" | "FUNDED";

    if (transaction.type === "FUND") {
      classification = "CREDIT";
      direction = "FUNDED";
    } else if (
      transaction.type === "TRANSFER" ||
      transaction.type === "WITHDRAWAL"
    ) {
      const isReceiver = transaction.receiver_wallet_id === userWalletId;
    //   const isSender = transaction.sender_wallet_id === userWalletId;

      if (isReceiver) {
        classification = "CREDIT";
        direction = "RECEIVED";
      } else {
        classification = "DEBIT";
        direction = "SENT";
      } 
    } else {
      classification = "DEBIT";
      direction = "SENT";
    }

    // Fetch counterparty details if available
    let counterpartyInfo = {};

    if (
      transaction.type === "TRANSFER" &&
      transaction.receiver_wallet_id &&
      transaction.sender_wallet_id
    ) {
      const counterpartyWalletId =
        direction === "SENT"
          ? transaction.receiver_wallet_id
          : transaction.sender_wallet_id;

      try {
        const counterpartyWallet = await walletRepository.findById(
          counterpartyWalletId,
        );
        if (counterpartyWallet) {
          const counterpartyUser = await userRepository.findById(
            counterpartyWallet.user_id,
          );
          if (counterpartyUser) {
            counterpartyInfo = {
              wallet_id: counterpartyWalletId,
              user_name: counterpartyUser.first_name + " " + counterpartyUser.last_name,
              email: counterpartyUser.email,
            };
          }
        }
      } catch (error) {
        // Silently fail if counterparty lookup fails
      }
    }

    return {
      ...transaction,
      classification,
      direction,
      counterparty: counterpartyInfo,
    };
  }
}

export const transactionController = new TransactionController();
