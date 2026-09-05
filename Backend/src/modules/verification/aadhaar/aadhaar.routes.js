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

// Aadhaar Auto Verification Advance (Digital KYC Auto Verification with OTP)
router.post('/srv2/digital-kyc/aadhar/auto-verificationSpecial', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);
router.post('/srv2/digital-kyc/aadhar/auto-verificationspecial', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);
router.post('/srv2/digital-kyc/aadhar/auto-verification', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);
router.post('/digital-kyc/aadhar/auto-verificationSpecial', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);
router.post('/digital-kyc/aadhar/auto-verificationspecial', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);
router.post('/digital-kyc/aadhar/auto-verification', verifyApiClientCredentials, AadhaarVerificationController.autoVerificationSpecial);

export default router;
