import { Router } from 'express';
import IdfyController from './idfy.controller.js';
import { verifyApiClientCredentials } from '../credentials/apiAuth.middleware.js';

const router = Router();

// IDFY Bank Account Verification Endpoints (protected by Bharat API credentials)
router.post('/idfy/validate_bank_account', verifyApiClientCredentials, IdfyController.validateBankAccount);
router.post('/idfy/validate-bank-account', verifyApiClientCredentials, IdfyController.validateBankAccount);
router.post('/idfy/bank', verifyApiClientCredentials, IdfyController.validateBankAccount);
router.post('/validate_bank_account', verifyApiClientCredentials, IdfyController.validateBankAccount);
router.post('/validate-bank-account', verifyApiClientCredentials, IdfyController.validateBankAccount);

// Root relative endpoints for router mounting
router.post('/', verifyApiClientCredentials, IdfyController.validateBankAccount);

export default router;
