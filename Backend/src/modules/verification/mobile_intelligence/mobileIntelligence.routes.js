import { Router } from 'express';
import { MobileIntelligenceController } from './mobileIntelligence.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Mobile Intelligence Routes (WhoCalled Caller ID & Reverse Phone Search)
 * Supported paths:
 * - POST /api/v1/verify/mobile-intelligence
 * - POST /verify/mobile-intelligence
 * - GET  /api/v1/verify/mobile-intelligence
 * - GET  /verify/mobile-intelligence
 * - POST /srv2/mobile-intelligence
 * - POST /api/v1/mobile-intelligence
 */
const supportedPaths = [
  '/verify/mobile-intelligence',
  '/api/v1/verify/mobile-intelligence',
  '/srv2/mobile-intelligence',
  '/api/v1/mobile-intelligence',
  '/mobile-intelligence',
  '/verify/caller-intelligence',
  '/api/v1/verify/caller-intelligence',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, MobileIntelligenceController.searchMobileIntelligence);
  router.get(path, verifyApiClientCredentials, MobileIntelligenceController.searchMobileIntelligence);
});

export default router;
