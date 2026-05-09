import type { Knex } from 'knex';
import { env } from './src/config/env';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: env.db.url ? env.db.url : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      // ssl: {
      //   rejectUnauthorized: false,
      // },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  production: {
    client: 'mysql2',
    connection: env.db.url ? env.db.url : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      // ssl: {
      //   rejectUnauthorized: false,
      // },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/database/migrations',
    },
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/database/migrations',
    },
  },
};

export default config;
