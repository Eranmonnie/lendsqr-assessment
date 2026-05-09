"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./src/config/env");
const config = {
    development: {
        client: 'mysql2',
        connection: {
            host: env_1.env.db.host,
            port: env_1.env.db.port,
            user: env_1.env.db.user,
            password: env_1.env.db.password,
            database: env_1.env.db.name,
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
        connection: {
            host: env_1.env.db.host,
            port: env_1.env.db.port,
            user: env_1.env.db.user,
            password: env_1.env.db.password,
            database: env_1.env.db.name,
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
exports.default = config;
