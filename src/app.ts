import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
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
