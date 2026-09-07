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
import prefillRoutes from './modules/verification/prefill/prefill.routes.js';
import nameFinderRoutes from './modules/verification/name_finder/nameFinder.routes.js';
import apilayerRoutes from './modules/apilayer/apilayer.routes.js';
import geocodingRoutes from './modules/geocoding/geocoding.routes.js';
import idfyRoutes from './modules/idfy/idfy.routes.js';
import uanRoutes from './modules/verification/uan/uan.routes.js';
import mobileUpiRoutes from './modules/verification/mobile_upi/mobileUpi.routes.js';
import domainRoutes from './modules/domain/domain.routes.js';
import ifscRoutes from './modules/ifsc/ifsc.routes.js';
import digilockerRoutes from './modules/verification/digilocker/digilocker.routes.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Api-Id',
      'X-Api-Key',
      'X-Token-Id',
      'x-api-id',
      'x-api-key',
      'x-token-id',
      'x-user-email',
      'X-User-Email',
      '*'
    ],
    maxAge: 86400, // 24 hours browser preflight caching
  })
);
app.options('*', cors());

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

// Direct service routes matching provider URL structure (/srv2/validation/pan, /srv3/verification/aadhar, /idfc/beneficiary, /srv4/credit-report/prefill)
app.use('/', panRoutes);
app.use('/', aadhaarRoutes);
app.use('/', bankRoutes);
app.use('/', prefillRoutes);
app.use('/', nameFinderRoutes);
app.use('/', uanRoutes);
app.use('/srv3/uan-mobile', uanRoutes);
app.use('/srv3/uan-direct', uanRoutes);
app.use('/', mobileUpiRoutes);
app.use('/', apilayerRoutes);
app.use('/', idfyRoutes);
app.use('/idfy', idfyRoutes);
app.use('/reverse-geocode', geocodingRoutes);
app.use('/reverse', geocodingRoutes);
app.use('/', domainRoutes);
app.use('/ifsc', ifscRoutes);
app.use('/', digilockerRoutes);

// Mount Main API Routes
app.use('/api/v1', apiRouter);

// Mount Direct Root Route for IFSC (e.g. /YESB0DNB002 matching Razorpay root API)
app.use('/', ifscRoutes);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
