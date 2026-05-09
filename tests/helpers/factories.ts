import { userRepository } from '../../src/repositories/UserRepository';
import { walletRepository } from '../../src/repositories/WalletRepository';
import { hashPassword } from '../../src/utils/password';
import { signToken } from '../../src/utils/jwt';

let userCounter = 0;

export const createUser = async (overrides: Partial<any> = {}) => {
  userCounter += 1;
  const { password, ...restOverrides } = overrides;
  const password_hash = await hashPassword(password || 'Password123');
  return userRepository.create({
    first_name: 'Test',
    last_name: `User${userCounter}`,
    email: `test${userCounter}@example.com`,
    phone: `080000000${userCounter}`,
    password_hash,
    is_active: true,
    ...restOverrides,
  });
};

export const createWallet = async (userId: string, overrides: Partial<any> = {}) => {
  return walletRepository.create({
    user_id: userId,
    balance: 0,
    currency: 'NGN',
    status: 'ACTIVE',
    ...overrides,
  });
};

export const setUserPin = async (userId: string, pin = '1234') => {
  const pinHash = await hashPassword(pin);
  await userRepository.update(userId, { pin_hash: pinHash });
};

export const authHeaderForUser = (userId: string) => `Bearer ${signToken({ userId })}`;
