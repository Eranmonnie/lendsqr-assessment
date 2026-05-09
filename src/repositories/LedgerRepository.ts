import { BaseRepository } from './BaseRepository';

export interface LedgerEntry {
  id?: string;
  wallet_id: string;
  transaction_id: string;
  type: 'FUND' | 'TRANSFER' | 'WITHDRAWAL' | 'REVERSAL';
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  created_at?: Date;
}

export class LedgerRepository extends BaseRepository<LedgerEntry> {
  constructor() {
    super('ledger_entries');
  }
}

export const ledgerRepository = new LedgerRepository();
