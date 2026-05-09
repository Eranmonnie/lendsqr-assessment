import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {

    table.uuid('id').primary().defaultTo(knex.fn.uuid());

    table.string('first_name').notNullable();
    table.string('last_name').notNullable();

    table.string('email').notNullable().unique();
    table.string('phone').unique().nullable();

    table.string('password_hash').notNullable();

    table.string('pin_hash').nullable();

    table.boolean('is_active').defaultTo(true);

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
