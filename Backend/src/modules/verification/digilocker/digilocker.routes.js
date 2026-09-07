import { Router } from 'express';
import DigilockerController from './digilocker.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

// Primary & Canonical API Route
router.post('/srv2/validation/digilocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);

// Common typo & Direct Alias API Routes
router.post('/srv2/validation/digllocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/digilocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/digllocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/digilocker/generate-token', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/digilocker/fetch-details', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/validation/digilocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);
router.post('/validation/digllocker-digital-kyc', verifyApiClientCredentials, DigilockerController.handleRequest);

// White-Labeled Consent Redirect Gateway Routes (Browser flows)
router.get('/srv2/v1/digilocker/start/:sessionId', DigilockerController.handleConsentRedirect);
router.get('/api/v1/prod/srv2/v1/digilocker/start/:sessionId', DigilockerController.handleConsentRedirect);
router.get('/digilocker/start/:sessionId', DigilockerController.handleConsentRedirect);
router.get('/srv2/validation/digilocker-digital-kyc/auth', DigilockerController.handleConsentRedirect);
router.get('/validation/digilocker-digital-kyc/auth', DigilockerController.handleConsentRedirect);

export default router;
