import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform(Number),
    SALT_ROUND: z.string().default('10').transform(Number),

    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.string().default('3306').transform(Number),
    DB_USER: z.string().default('root'),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('lendsqr_db'),
    DB_NAME_TEST: z.string().optional(),
    DB_URL: z.string().optional(),

    JWT_SECRET: z.string().default('super_secret_default_key_change_me'),
    JWT_EXPIRES_IN: z.string().default('1d'),

    PAYSTACK_SECRET_KEY: z.string().default('sk_test_mock_secret'),

    ADJUTOR_BASE_URL: z.string().url().default('https://api.adjutor.lendsqr.com'),
    ADJUTOR_API_KEY: z.string().default('mock_adjutor_api_key'),

    BLACKLIST_MODE: z.enum(['strict', 'lenient', 'disabled']).default('strict'),

    HOST: z.string().default('localhost'),
    PRODUCTION_URL: z.string().optional(),
  })
  .refine(
    (data) => {
      // In production, require critical secrets
      if (data.NODE_ENV === 'production') {
        return (
          data.JWT_SECRET !== 'super_secret_default_key_change_me' &&
          data.PAYSTACK_SECRET_KEY !== 'sk_test_mock_secret' &&
          data.ADJUTOR_API_KEY !== 'mock_adjutor_api_key'
        );
      }
      return true;
    },
    {
      message: 'Production environment requires real secret keys (not defaults)',
      path: ['NODE_ENV'],
    }
  );

export type EnvType = z.infer<typeof envSchema>;

let parsedEnv: EnvType;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      console.error(`  • ${path}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}

/**
 * Parsed and validated application environment values.
 */
export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  saltRound: parsedEnv.SALT_ROUND,
  db: {
    host: parsedEnv.DB_HOST,
    port: parsedEnv.DB_PORT,
    user: parsedEnv.DB_USER,
    password: parsedEnv.DB_PASSWORD,
    name: parsedEnv.NODE_ENV === 'test' ? parsedEnv.DB_NAME_TEST || parsedEnv.DB_NAME : parsedEnv.DB_NAME,
    url: parsedEnv.DB_URL,
  },
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiresIn: parsedEnv.JWT_EXPIRES_IN,
  },
  paystack: {
    secretKey: parsedEnv.PAYSTACK_SECRET_KEY,
  },
  adjutor: {
    baseUrl: parsedEnv.ADJUTOR_BASE_URL,
    apiKey: parsedEnv.ADJUTOR_API_KEY,
  },
  blacklist: {
    mode: parsedEnv.BLACKLIST_MODE,
  },
  host: parsedEnv.HOST,
  productionUrl: parsedEnv.PRODUCTION_URL,
};
