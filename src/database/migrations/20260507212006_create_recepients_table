import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('recipients', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

        table.string('recipient_code').notNullable();

        table.string('account_number').notNullable();

        table.string('bank_code').notNullable();

        table.string('account_name').notNullable();

        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('recipients');
}