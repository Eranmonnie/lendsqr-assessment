import db from '../database/db';
import { walletRepository } from '../repositories/WalletRepository';
import { userRepository } from '../repositories/UserRepository';
import { hashPassword } from '../utils/password';

export class WalletService {
  /**
   * Validates that a wallet PIN is a 4-digit numeric value.
   * @param pin string (wallet PIN)
   * @returns Promise<void> (validation only)
   * @throws Error if the PIN format is invalid
   */
  private async validatePin(pin: string) {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be a 4-digit number.');
    }
  }

  /**
   * Creates a wallet and updates the user's PIN in a single database transaction.
   * If either operation fails, both are rolled back to maintain consistency.
    * @param userId string (owner user ID)
    * @param pin string (4-digit wallet PIN)
    * @returns Promise<any> (created wallet record)
    * @throws Error if the wallet already exists, the PIN is invalid, or the transaction fails
   */
  async createWalletWithPin(userId: string, pin: string) {

    const existingWallet = await walletRepository.findByUserId(userId);
    if (existingWallet) {
      throw new Error('User already has a wallet.');
    }

    await this.validatePin(pin);

    const pinHash = await hashPassword(pin);

    return await db.transaction(async (trx) => {
      try {
        await userRepository.update(userId, { pin_hash: pinHash }, trx);

        const newWallet = await walletRepository.create(
          {
            user_id: userId,
            balance: 0.0,
            currency: 'NGN',
            status: 'ACTIVE',
          },
          trx
        );

        return newWallet;
      } catch (error: any) {
        throw new Error(`Transaction failed: ${error.message}`, { cause: error });
      }
    });
  }

  /**
   * Finds a wallet by the owning user ID.
   * @param userId string (owner user ID)
   * @returns Promise<any> (wallet record)
   * @throws Error if the database lookup fails
   */
  async findByUserId(userId: string) {
    return await walletRepository.findByUserId(userId);
  }
}

export const walletService = new WalletService();
