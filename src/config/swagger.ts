import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Demo Credit API',
      version: '1.0.0',
      description: 'Fintech MVP API for wallet operations, user authentication, and payment processing',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: env.productionUrl,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            phone: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', format: 'decimal' },
            status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'SUSPENDED'] },
            currency: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            wallet_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['FUNDING', 'WITHDRAWAL', 'TRANSFER'] },
            amount: { type: 'number', format: 'decimal' },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
            reference: { type: 'string' },
            meta: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
