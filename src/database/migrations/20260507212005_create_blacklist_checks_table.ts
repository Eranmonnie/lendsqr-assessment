import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('blacklist_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    table.uuid('user_id').notNullable().unique();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    table.string('email').notNullable();
    table.string('phone').nullable();
    
    table.json('raw_response').nullable();
    
    table.timestamp('checked_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('blacklist_checks');
}
