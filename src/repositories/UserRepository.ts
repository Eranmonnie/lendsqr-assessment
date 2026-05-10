import { BaseRepository } from './BaseRepository';

export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  password_hash: string;
  pin_hash?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Repository for application users.
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Finds a user by email address.
   * @param email string (email address)
   * @returns Promise<User | undefined> (user record)
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return this.getQuery().where('email', email).first() as unknown as Promise<User | undefined>;
  }

  /**
   * Finds a user by phone number.
   * @param phone string (phone number)
   * @returns Promise<User | undefined> (user record)
   */
  async findByPhone(phone: string): Promise<User | undefined> {
    return this.getQuery().where('phone', phone).first() as unknown as Promise<User | undefined>;
  }

  /**
   * Finds a user by ID.
   * @param id string (user ID)
   * @returns Promise<User | undefined> (user record)
   */
  async findById(id: string): Promise<User | undefined> {
    return this.getQuery().where('id', id).first() as unknown as Promise<User | undefined>;
  }
}

export const userRepository = new UserRepository();
