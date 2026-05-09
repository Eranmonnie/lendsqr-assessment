import knex from 'knex';
import knexConfig from '../../knexfile';
import { env } from '../config/env';

const environment = env.nodeEnv || 'development';
const resolvedKnexConfig = (knexConfig as any).default || knexConfig;
const config =
  resolvedKnexConfig?.[environment] ||
  resolvedKnexConfig?.development || {
    client: 'mysql2',
    connection: {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
    },
  };

const db = knex(config);

export default db;
