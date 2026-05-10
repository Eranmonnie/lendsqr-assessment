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

/**
 * Repository for user wallets.
 */
export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super('wallets');
  }

  /**
   * Finds a wallet by owning user ID.
   * @param userId string (user ID)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<Wallet | undefined> (wallet record)
   */
  async findByUserId(userId: string, trx?: Knex.Transaction): Promise<Wallet | undefined> {
    return this.findOne({ user_id: userId }, trx);
  }

  /**
   * Locks a wallet row for update.
   * @param id string (wallet ID)
   * @param trx Knex.Transaction (transaction scope)
   * @returns Promise<Wallet | undefined> (locked wallet record)
   */
  async lockById(id: string, trx: Knex.Transaction): Promise<Wallet | undefined> {
    const clientName = trx.client.config.client;
    if (clientName === 'sqlite3') {
      return this.getQuery(trx).where({ id }).first();
    }
    return this.getQuery(trx).where({ id }).forUpdate().first();
  }

  /**
   * Atomically increments a wallet balance.
   * @param id string (wallet ID)
   * @param amount number (amount to add)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<void> (balance updated in place)
   */
  async incrementBalance(id: string, amount: number, trx?: Knex.Transaction): Promise<void> {
    await this.getQuery(trx)
      .where({ id })
      .increment('balance', amount);
  }

  /**
   * Atomically decrements a wallet balance.
   * @param id string (wallet ID)
   * @param amount number (amount to subtract)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<void> (balance updated in place)
   */
  async decrementBalance(id: string, amount: number, trx?: Knex.Transaction): Promise<void> {
    await this.getQuery(trx)
      .where({ id })
      .decrement('balance', amount);
  }
}

export const walletRepository = new WalletRepository();
