import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('ledger_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());

    table.uuid('wallet_id').notNullable();
    table.foreign('wallet_id').references('id').inTable('wallets').onDelete('RESTRICT');

    table.uuid('transaction_id').notNullable();
    table.foreign('transaction_id').references('id').inTable('transactions').onDelete('RESTRICT');

    table.enum('type', ['FUND', 'TRANSFER', 'WITHDRAWAL', 'REVERSAL']).notNullable();
    table.enum('direction', ['DEBIT', 'CREDIT']).notNullable();

    table.decimal('amount', 18, 2).notNullable();
    table.decimal('balance_before', 18, 2).notNullable();
    table.decimal('balance_after', 18, 2).notNullable();

    table.string('reference').notNullable().unique();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['wallet_id']);
    table.index(['transaction_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('ledger_entries');
}
