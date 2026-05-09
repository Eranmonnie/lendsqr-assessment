import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  saltRound: parseInt(process.env.SALT_ROUND || '10', 10),
  db: {
    url: process.env.DB_URL,
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name:
      process.env.NODE_ENV === 'test'
        ? process.env.DB_NAME_TEST || process.env.DB_NAME || 'lendsqr_db_test'
        : process.env.DB_NAME || 'lendsqr_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_default_key_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_secret',
  },
};
