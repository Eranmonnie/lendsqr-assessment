import { BaseRepository } from './BaseRepository';

export interface BlacklistCheck {
  id?: string;
  email: string;
  phone?: string | null;
  raw_response?: any;
  checked_at?: Date;
}

export class BlacklistRepository extends BaseRepository<BlacklistCheck> {
  constructor() {
    super('blacklist_checks');
  }
}

export const blacklistRepository = new BlacklistRepository();
