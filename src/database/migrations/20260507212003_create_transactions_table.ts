import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    table.enum('type', ['FUND', 'TRANSFER', 'WITHDRAWAL']).notNullable();
    
    table.decimal('amount', 18, 2).notNullable();
  
    table.string('currency', 3).defaultTo('NGN').notNullable();
    
    table.string('reference').notNullable().unique();
    
    table.enum('status', ['PENDING', 'SUCCESS', 'FAILED']).defaultTo('PENDING').notNullable();
    
    table.string('description').nullable()

    table.uuid('sender_wallet_id').nullable();
    table.foreign('sender_wallet_id').references('id').inTable('wallets').onDelete('RESTRICT');
    
    table.uuid('receiver_wallet_id').nullable();
    table.foreign('receiver_wallet_id').references('id').inTable('wallets').onDelete('RESTRICT');
    
    table.timestamps(true, true);
    
    table.index(['status']);
    table.index(['sender_wallet_id']);
    table.index(['receiver_wallet_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
