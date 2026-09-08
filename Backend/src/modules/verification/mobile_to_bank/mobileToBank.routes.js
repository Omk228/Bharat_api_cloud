import { Router } from 'express';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';
import MobileToBankController from './mobileToBank.controller.js';

const router = Router();

/**
 * Mobile To Bank Advance Endpoints
 * 1. Direct provider path: POST /srv3/mobile-to-bank/advance
 * 2. Aliased paths
 */
router.post('/srv3/mobile-to-bank/advance', verifyApiClientCredentials, MobileToBankController.verifyMobileToBankAdvance);
router.post('/mobile-to-bank/advance', verifyApiClientCredentials, MobileToBankController.verifyMobileToBankAdvance);
router.post('/api/v1/srv3/mobile-to-bank/advance', verifyApiClientCredentials, MobileToBankController.verifyMobileToBankAdvance);
router.post('/verification/mobile-to-bank/advance', verifyApiClientCredentials, MobileToBankController.verifyMobileToBankAdvance);

export default router;
