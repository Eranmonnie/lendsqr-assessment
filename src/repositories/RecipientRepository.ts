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

/**
 * Repository for saved transfer recipients.
 */
export class RecipientRepository extends BaseRepository<Recipient> {
  constructor() {
    super('recipients');
  }

  /**
   * Finds a recipient by recipient code.
   * @param recipient_code string (recipient code)
   * @returns Promise<Recipient | undefined> (recipient record)
   */
  async findByRecipientCode(recipient_code: string): Promise<Recipient | undefined> {
    return this.findOne({ recipient_code });
  }

  /**
   * Finds recipients matching a custom filter.
   * @param query Partial<Recipient> (lookup filter)
   * @returns Promise<Recipient[]> (matched recipients)
   */
  async findAllByCondition(query?: Partial<Recipient>): Promise<Recipient[]> {
    return this.getQuery().where(query as Record<string, unknown>).select('*') as unknown as Promise<Recipient[]>;
  }
}

export const recipientRepository = new RecipientRepository();
