import { BaseRepository } from "./BaseRepository";

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

export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super("transactions");
  }

  async findByReference(reference: string): Promise<Transaction | undefined> {
    return this.findOne({ reference });
  }

  findByCondition(
    condition: Partial<Transaction>,
  ): Promise<Transaction | undefined> {
    return this.findOne(condition);
  }
}

export const transactionRepository = new TransactionRepository();
