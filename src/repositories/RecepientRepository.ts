import { BaseRepository } from './BaseRepository';

export interface Recepient {
    id: string;
    user_id: string;
    recipient_code: string;
    account_number: string;
    bank_code: string;
    account_name: string;
    created_at?: Date;
    updated_at?: Date;
}

export class RecepientRepository extends BaseRepository<Recepient> {
    constructor() {
        super('recepients');
    }

    async findByRecepientCode(recipient_code: string): Promise<Recepient | undefined> {
        return this.findOne({ recipient_code });
    }

    async findAll(query?: any): Promise<Recepient[]> {
        return this.getQuery().where(query).select('*') as unknown as Promise<Recepient[]>;
    }
}

export const recepientRepository = new RecepientRepository();
