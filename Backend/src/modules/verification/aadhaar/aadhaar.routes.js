import { Router } from 'express';
import { AadhaarVerificationController } from './aadhaar.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

// Public Aadhaar verification routes authenticated via API ID, API Key, Token ID
router.post('/srv3/verification/aadhar', verifyApiClientCredentials, AadhaarVerificationController.verifyAadhaar);
router.post('/verification/aadhar', verifyApiClientCredentials, AadhaarVerificationController.verifyAadhaar);
router.post('/verify/aadhaar/direct', verifyApiClientCredentials, AadhaarVerificationController.verifyAadhaar);
router.post('/verify/aadhaar', verifyApiClientCredentials, AadhaarVerificationController.verifyAadhaar);
router.post('/aadhaar/direct', verifyApiClientCredentials, AadhaarVerificationController.verifyAadhaar);

export default router;
