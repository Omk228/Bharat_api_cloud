import { Router } from 'express';
import { MobileSmartController } from './mobileSmart.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Mobile Smart Verification Routes (Composite of TransUnion & Mobile Intelligence)
 * Supported paths:
 * - POST /api/v1/verify/mobile-smart
 * - GET  /api/v1/verify/mobile-smart
 * - POST /verify/mobile-smart
 * - GET  /verify/mobile-smart
 * - POST /api/v1/mobile-smart
 * - GET  /api/v1/mobile-smart
 * - POST /mobile-smart
 * - GET  /mobile-smart
 */
const supportedVerificationPaths = [
  '/verify/mobile-smart',
  '/api/v1/verify/mobile-smart',
  '/mobile-smart',
  '/api/v1/mobile-smart',
];

supportedVerificationPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, MobileSmartController.searchMobileSmart);
  router.get(path, verifyApiClientCredentials, MobileSmartController.searchMobileSmart);
});

// PDF Report retrieval routes (public report tokens)
router.get('/api/v1/reports/mobile-smart/:token', MobileSmartController.getPdfReport);
router.get('/reports/mobile-smart/:token', MobileSmartController.getPdfReport);

export default router;
