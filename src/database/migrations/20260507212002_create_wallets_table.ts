import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    table.uuid('user_id').notNullable().unique();
    table.foreign('user_id').references('id').inTable('users').onDelete('RESTRICT');
    
    table.decimal('balance', 18, 2).defaultTo(0.00).notNullable();
    table.string('currency', 3).defaultTo('NGN').notNullable();
    
    table.enum('status', ['ACTIVE', 'FROZEN']).defaultTo('ACTIVE').notNullable();
    
    table.timestamps(true, true);
    
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('wallets');
}
