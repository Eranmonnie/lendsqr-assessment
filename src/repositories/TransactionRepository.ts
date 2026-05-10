import { BaseRepository } from "./BaseRepository";
import { Knex } from "knex";

export interface Transaction {
  id?: string;
  type: "FUND" | "TRANSFER" | "WITHDRAWAL";
  amount: number;
  currency?: string;
  reference: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
  description?: string;
  sender_wallet_id?: string | null;
  receiver_wallet_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
  meta?: Record<string, any> | string;
}

export interface TransactionWithClassification extends Transaction {
  classification: "CREDIT" | "DEBIT";
  direction: "SENT" | "RECEIVED" | "FUNDED";
}

/**
 * Repository for financial transactions and wallet activity.
 */
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super("transactions");
  }

  /**
   * Finds a transaction by its unique reference.
   * @param reference string (transaction reference)
   * @returns Promise<Transaction | undefined> (transaction record)
   */
  async findByReference(reference: string): Promise<Transaction | undefined> {
    return this.findOne({ reference });
  }

  /**
   * Finds transactions using a custom condition.
   * @param condition Partial<Transaction> (lookup filter)
   * @returns Promise<Transaction | undefined> (transaction record)
   */
  findByCondition(
    condition: Partial<Transaction>,
  ): Promise<Transaction | undefined> {
    return this.findOne(condition);
  }

  /**
   * Find all transactions involving a wallet (as sender or receiver)
    * @param walletId string (wallet ID)
    * @param filters object (status, type, limit, offset)
    * @param trx Knex.Transaction (optional transaction scope)
    * @returns Promise<Transaction[]> (matching transactions)
   */
  async findByWalletId(
    walletId: string,
    filters?: {
      status?: "PENDING" | "SUCCESS" | "FAILED";
      type?: "FUND" | "TRANSFER" | "WITHDRAWAL";
      limit?: number;
      offset?: number;
    },
    trx?: Knex.Transaction,
  ): Promise<Transaction[]> {
    return this.findWithPaginationByQuery(
      (query) => {
        let transactionQuery = query
          .where("sender_wallet_id", walletId)
          .orWhere("receiver_wallet_id", walletId);

        if (filters?.status) {
          transactionQuery = transactionQuery.where("status", filters.status);
        }

        if (filters?.type) {
          transactionQuery = transactionQuery.where("type", filters.type);
        }

        return transactionQuery;
      },
      filters?.limit,
      filters?.offset,
      "created_at",
      "desc",
      trx,
    );
  }

  /**
   * Get transaction count for a wallet
    * @param walletId string (wallet ID)
    * @param filters object (status, type)
    * @param trx Knex.Transaction (optional transaction scope)
    * @returns Promise<number> (matching transaction count)
   */
  async countByWalletId(
    walletId: string,
    filters?: {
      status?: "PENDING" | "SUCCESS" | "FAILED";
      type?: "FUND" | "TRANSFER" | "WITHDRAWAL";
    },
    trx?: Knex.Transaction,
  ): Promise<number> {
    return this.countByQuery(
      (query) => {
        let transactionQuery = query
          .where("sender_wallet_id", walletId)
          .orWhere("receiver_wallet_id", walletId);

        if (filters?.status) {
          transactionQuery = transactionQuery.where("status", filters.status);
        }

        if (filters?.type) {
          transactionQuery = transactionQuery.where("type", filters.type);
        }

        return transactionQuery;
      },
      trx,
    );
  }
}

export const transactionRepository = new TransactionRepository();
