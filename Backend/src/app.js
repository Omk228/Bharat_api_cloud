import express from 'express';
import path from 'node:path';
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
import statementAnalyzerRoutes from './modules/verification/statement_analyzer/statementAnalyzer.routes.js';
import mobileToBankRoutes from './modules/verification/mobile_to_bank/mobileToBank.routes.js';
import transunionRoutes from './modules/verification/transunion/transunion.routes.js';
import crifRoutes from './modules/verification/crif/crif.routes.js';

const app = express();

// 1. Bulletproof Global CORS Middleware (Executed before ANY other middleware)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Api-Id, X-Api-Key, X-Token-Id, x-api-id, x-api-key, x-token-id, x-user-email, X-User-Email, Cache-Control, Pragma'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Immediately respond to preflight OPTIONS requests with 204 No Content
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
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
    maxAge: 86400,
  })
);
app.options('*', (req, res) => res.status(204).end());

// Logging Middleware
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Request Parsers - increased limit for PDF statement uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads (payment receipts, screenshots, docs)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bharat API Cloud Backend Gateway',
    timestamp: new Date().toISOString(),
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
app.use('/', statementAnalyzerRoutes);
app.use('/', mobileToBankRoutes);
app.use('/', transunionRoutes);
app.use('/srv5/transunion-Score-Hybrid', transunionRoutes);
app.use('/', crifRoutes);
app.use('/crif/Credit-ScoreV4', crifRoutes);

// Serve isolated test-tools statically
app.use('/test-tools', express.static(path.resolve(process.cwd(), '../test-tools')));
app.use('/test-tools', express.static(path.resolve(process.cwd(), 'test-tools')));

// Mount Main API Routes
app.use('/api/v1', apiRouter);

// Mount Direct Root Route for IFSC (e.g. /YESB0DNB002 matching Razorpay root API)
app.use('/', ifscRoutes);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
