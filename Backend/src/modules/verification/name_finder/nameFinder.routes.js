import { Router } from 'express';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';
import NameFinderVerificationController from './nameFinder.controller.js';

const router = Router();

/**
 * Mobile To Name Finder Endpoints
 * 1. Direct provider path: POST /srv2/mobile-name-finder
 * 2. Aliased routes
 */
router.post('/srv2/mobile-name-finder', verifyApiClientCredentials, NameFinderVerificationController.verifyMobileNameFinder);
router.post('/kyc/mobile-name-finder', verifyApiClientCredentials, NameFinderVerificationController.verifyMobileNameFinder);
router.post('/verification/mobile-name-finder', verifyApiClientCredentials, NameFinderVerificationController.verifyMobileNameFinder);
router.post('/api/v1/srv2/mobile-name-finder', verifyApiClientCredentials, NameFinderVerificationController.verifyMobileNameFinder);
router.post('/api/v1/kyc/mobile-name-finder', verifyApiClientCredentials, NameFinderVerificationController.verifyMobileNameFinder);

export default router;
