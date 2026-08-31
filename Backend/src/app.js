import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.config.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging Middleware
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Request Parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Root Health / Info Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Bharat API Cloud Backend Service',
    version: '1.0.0',
    status: 'online',
    documentation: '/api/v1/health',
  });
});

// Mount Main API Routes
app.use('/api/v1', apiRouter);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
