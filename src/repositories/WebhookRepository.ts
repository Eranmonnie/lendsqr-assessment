import { Knex } from 'knex';
import { BaseRepository } from './BaseRepository';

export interface Webhook {
    id?: string;
    reference: string;
    type: string;
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    payload: Record<string, any>;
    created_at?: Date;
    updated_at?: Date;
}

export class WebhookRepository extends BaseRepository<Webhook> {
    constructor() {
        super('webhooks');
    }

    async findByReference(reference: string, trx?: Knex.Transaction): Promise<Webhook | undefined> {
        return this.findOne({ reference }, trx);
    }

    async updateByReference(reference: string, data: Partial<Webhook>, trx?: Knex.Transaction): Promise<Webhook | undefined> {
        return this.findAndUpdate({ reference }, data, trx);
    }
}

export const webhookRepository = new WebhookRepository();
