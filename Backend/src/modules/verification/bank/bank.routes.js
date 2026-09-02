import { Router } from 'express';
import BankVerificationController from './bank.controller.js';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';

const router = Router();

// 1. Direct IDSPay Endpoint Match: POST /idfc/beneficiary
router.post('/idfc/beneficiary', verifyApiClientCredentials, BankVerificationController.verifyBankPennyLess);

// 2. Standard Bharat API Cloud Endpoint Matches
router.post('/verification/bank', verifyApiClientCredentials, BankVerificationController.verifyBankPennyLess);
router.post('/api/v1/idfc/beneficiary', verifyApiClientCredentials, BankVerificationController.verifyBankPennyLess);
router.post('/api/v1/verification/bank', verifyApiClientCredentials, BankVerificationController.verifyBankPennyLess);

export default router;
