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

/**
 * Repository for persisted webhook events.
 */
export class WebhookRepository extends BaseRepository<Webhook> {
    constructor() {
        super('webhooks');
    }

    /**
     * Finds a webhook by reference.
     * @param reference string (transaction reference)
     * @param trx Knex.Transaction (optional transaction scope)
     * @returns Promise<Webhook | undefined> (webhook record)
     */
    async findByReference(reference: string, trx?: Knex.Transaction): Promise<Webhook | undefined> {
        return this.findOne({ reference }, trx);
    }

    /**
     * Updates a webhook by reference.
     * @param reference string (transaction reference)
     * @param data Partial<Webhook> (update payload)
     * @param trx Knex.Transaction (optional transaction scope)
     * @returns Promise<Webhook | undefined> (updated webhook record)
     */
    async updateByReference(reference: string, data: Partial<Webhook>, trx?: Knex.Transaction): Promise<Webhook | undefined> {
        return this.findAndUpdate({ reference }, data, trx);
    }
}

export const webhookRepository = new WebhookRepository();
