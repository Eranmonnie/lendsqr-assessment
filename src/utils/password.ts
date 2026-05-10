import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const SALT_ROUNDS = env.saltRound;

/**
 * Hashes a plain text password using bcrypt.
 * @param password string (plain text password)
 * @returns Promise<string> (hashed password)
 * @throws Error if hashing fails
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password against a bcrypt hash.
 * @param password string (plain text password)
 * @param hash string (stored bcrypt hash)
 * @returns Promise<boolean> (true if the password matches)
 * @throws Error if comparison fails
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
