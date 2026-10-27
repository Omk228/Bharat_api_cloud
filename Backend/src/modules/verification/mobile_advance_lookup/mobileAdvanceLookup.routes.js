import { Router } from 'express';
import { MobileAdvanceLookupController } from './mobileAdvanceLookup.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Mobile Advance Lookup Routes (Composite of Prefill & Intelligence)
 * Supported paths:
 * - POST /api/v1/verify/mobile-advance-lookup
 * - POST /verify/mobile-advance-lookup
 * - GET  /api/v1/verify/mobile-advance-lookup
 * - GET  /verify/mobile-advance-lookup
 * - POST /srv2/mobile-advance-lookup
 * - POST /api/v1/mobile-advance-lookup
 * - POST /mobile-advance-lookup
 */
const supportedPaths = [
  '/verify/mobile-advance-lookup',
  '/api/v1/verify/mobile-advance-lookup',
  '/srv2/mobile-advance-lookup',
  '/api/v1/mobile-advance-lookup',
  '/mobile-advance-lookup',
  '/verify/mobile-advance',
  '/api/v1/verify/mobile-advance',
  '/mobile-advance',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, MobileAdvanceLookupController.searchMobileAdvanceLookup);
  router.get(path, verifyApiClientCredentials, MobileAdvanceLookupController.searchMobileAdvanceLookup);
});

export default router;
