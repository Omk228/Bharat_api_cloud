import { Router } from 'express';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';
import PrefillVerificationController from './prefill.controller.js';

const router = Router();

/**
 * Mobile to Prefill Endpoints
 * 1. Direct provider path: POST /srv4/credit-report/prefill
 * 2. Aliased routes
 */
router.post('/srv4/credit-report/prefill', verifyApiClientCredentials, PrefillVerificationController.verifyPrefill);
router.post('/verification/prefill', verifyApiClientCredentials, PrefillVerificationController.verifyPrefill);
router.post('/kyc/mobile-prefill', verifyApiClientCredentials, PrefillVerificationController.verifyPrefill);
router.post('/api/v1/srv4/credit-report/prefill', verifyApiClientCredentials, PrefillVerificationController.verifyPrefill);
router.post('/api/v1/verification/prefill', verifyApiClientCredentials, PrefillVerificationController.verifyPrefill);

export default router;
