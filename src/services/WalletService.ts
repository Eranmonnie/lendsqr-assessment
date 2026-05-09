import db from '../database/db';
import { walletRepository } from '../repositories/WalletRepository';
import { userRepository } from '../repositories/UserRepository';
import { hashPassword } from '../utils/password';

export class WalletService {
  private async validatePin(pin: string) {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be a 4-digit number.');
    }
  }

  /**
   * Creates a wallet and updates the user's PIN in a single database transaction.
   * If either operation fails, both are rolled back to maintain consistency.
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

  async findByUserId(userId: string) {
    return await walletRepository.findByUserId(userId);
  }
}

export const walletService = new WalletService();
