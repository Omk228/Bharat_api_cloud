import { Router } from 'express';
import DomainController from './domain.controller.js';
import { verifyApiClientCredentials } from '../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Domain Age Verification Routes (Protected strictly by Bharat API Cloud Credentials)
 * Requires mandatory api_id, api_key, token_id in headers, query, or body.
 */
router.get('/dosvak/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);
router.post('/dosvak/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);

router.get('/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);
router.post('/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);

router.get('/verification/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);
router.post('/verification/domain-age', verifyApiClientCredentials, DomainController.getDomainAge);

export default router;

