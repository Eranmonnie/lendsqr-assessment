import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
});
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
