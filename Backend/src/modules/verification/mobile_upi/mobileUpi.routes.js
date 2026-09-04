import { Router } from 'express';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';
import MobileUpiVerificationController from './mobileUpi.controller.js';

const router = Router();

/**
 * Mobile To UPI Lookup Endpoints
 * 1. Direct provider path: POST /srv2/mobile-upi-lookup/enhanced
 * 2. Aliased routes
 */
router.post('/srv2/mobile-upi-lookup/enhanced', verifyApiClientCredentials, MobileUpiVerificationController.verifyMobileUpi);
router.post('/srv2/mobile-upi-lookup', verifyApiClientCredentials, MobileUpiVerificationController.verifyMobileUpi);
router.post('/api/v1/srv2/mobile-upi-lookup/enhanced', verifyApiClientCredentials, MobileUpiVerificationController.verifyMobileUpi);
router.post('/verification/mobile-upi-lookup', verifyApiClientCredentials, MobileUpiVerificationController.verifyMobileUpi);

export default router;
