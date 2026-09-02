import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './core/config/env.config.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './core/middlewares/notFound.middleware.js';
import { errorHandler } from './core/middlewares/error.middleware.js';

import panRoutes from './modules/verification/pan/pan.routes.js';
import aadhaarRoutes from './modules/verification/aadhaar/aadhaar.routes.js';
import bankRoutes from './modules/verification/bank/bank.routes.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Id', 'X-Api-Key', 'X-Token-Id', 'x-api-id', 'x-api-key', 'x-token-id'],
    maxAge: 86400, // 24 hours browser preflight caching
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
    architecture: 'Modular Monolith',
    status: 'online',
    documentation: '/api/v1/health',
  });
});

// Direct service routes matching provider URL structure (/srv2/validation/pan, /srv3/verification/aadhar, /idfc/beneficiary)
app.use('/', panRoutes);
app.use('/', aadhaarRoutes);
app.use('/', bankRoutes);

// Mount Main API Routes
app.use('/api/v1', apiRouter);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
