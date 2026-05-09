import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('webhooks', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.string('reference').notNullable();

        table.string('type').notNullable();

        table.enum('status', ['PROCESSING', 'SUCCESS', 'FAILED']).defaultTo('PROCESSING').notNullable();

        table.json('payload').notNullable();

        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('webhooks');
}