import { Router } from 'express';
import { TanLookupController } from './tanLookup.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * TAN Lookup Verification Routes
 * Supported paths:
 * 1. POST /verify/tan-lookup & POST /api/v1/verify/tan-lookup
 * 2. POST /tan-lookup & POST /api/v1/tan-lookup
 * 3. GET /verify/tan-lookup & GET /api/v1/verify/tan-lookup (for console / test params)
 */
const supportedPaths = [
  '/verify/tan-lookup',
  '/api/v1/verify/tan-lookup',
  '/tan-lookup',
  '/api/v1/tan-lookup',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, TanLookupController.lookupTan);
  router.get(path, verifyApiClientCredentials, TanLookupController.lookupTan);
});

// Also support base mounted paths when router is mounted at /verify/tan-lookup or /tan-lookup
router.post('/', verifyApiClientCredentials, TanLookupController.lookupTan);
router.get('/', verifyApiClientCredentials, TanLookupController.lookupTan);

export default router;
