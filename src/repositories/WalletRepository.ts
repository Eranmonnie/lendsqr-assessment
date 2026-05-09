import { Knex } from 'knex';
import { BaseRepository } from './BaseRepository';

export interface Wallet {
  id?: string;
  user_id: string;
  balance?: number;
  currency?: string;
  status?: 'ACTIVE' | 'FROZEN';
  created_at?: Date;
  updated_at?: Date;
}

export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super('wallets');
  }

  async findByUserId(userId: string, trx?: Knex.Transaction): Promise<Wallet | undefined> {
    return this.findOne({ user_id: userId }, trx);
  }

  async lockById(id: string, trx: Knex.Transaction): Promise<Wallet | undefined> {
    return this.getQuery(trx).where({ id }).forUpdate().first();
  }

  // Atomically increment a balance using Knex's raw queries or increment function
  async incrementBalance(id: string, amount: number, trx?: Knex.Transaction): Promise<void> {
    await this.getQuery(trx)
      .where({ id })
      .increment('balance', amount);
  }

  // Atomically decrement a balance
  async decrementBalance(id: string, amount: number, trx?: Knex.Transaction): Promise<void> {
    await this.getQuery(trx)
      .where({ id })
      .decrement('balance', amount);
  }
}

export const walletRepository = new WalletRepository();
