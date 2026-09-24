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

// 3. Bank Account Validation V2 Endpoints
router.post('/api/v1/bank/account-validation', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);
router.post('/api/v1/bank/account_validation', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);
router.post('/bank/account_validation', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);
router.post('/bank/account-validation', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);
router.post('/api/v1/verify/bank-v2', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);
router.post('/verify/bank-v2', verifyApiClientCredentials, BankVerificationController.verifyBankAccountV2);

export default router;
