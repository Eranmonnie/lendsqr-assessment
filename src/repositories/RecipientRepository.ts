import { BaseRepository } from './BaseRepository';

export interface Recipient {
  id: string;
  user_id: string;
  recipient_code: string;
  account_number: string;
  bank_code: string;
  account_name: string;
  created_at?: Date;
  updated_at?: Date;
}

export class RecipientRepository extends BaseRepository<Recipient> {
  constructor() {
    super('recipients');
  }

  async findByRecipientCode(recipient_code: string): Promise<Recipient | undefined> {
    return this.findOne({ recipient_code });
  }

  async findAllByCondition(query?: Partial<Recipient>): Promise<Recipient[]> {
    return this.getQuery().where(query as Record<string, unknown>).select('*') as unknown as Promise<Recipient[]>;
  }
}

export const recipientRepository = new RecipientRepository();
