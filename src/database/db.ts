import knex from 'knex';
import knexConfig from '../../knexfile';
import { env } from '../config/env';

const environment = env.nodeEnv || 'development';
const config = knexConfig[environment];

const db = knex(config);

export default db;
