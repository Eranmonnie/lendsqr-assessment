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

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.getQuery().where('email', email).first() as unknown as Promise<User | undefined>;
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    return this.getQuery().where('phone', phone).first() as unknown as Promise<User | undefined>;
  }

  async findById(id: string): Promise<User | undefined> {
    return this.getQuery().where('id', id).first() as unknown as Promise<User | undefined>;
  }
}

export const userRepository = new UserRepository();
