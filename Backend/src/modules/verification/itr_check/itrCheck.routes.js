import { Router } from 'express';
import { ItrCheckController } from './itrCheck.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * ITR Filing Verification Routes
 * Supported paths:
 * 1. POST /verify/itr-check & POST /api/v1/verify/itr-check
 * 2. POST /itr-check & POST /api/v1/itr-check
 * 3. GET /verify/itr-check & GET /api/v1/verify/itr-check (for console / test params)
 */
const supportedPaths = [
  '/verify/itr-check',
  '/api/v1/verify/itr-check',
  '/itr-check',
  '/api/v1/itr-check',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, ItrCheckController.verifyItrCheck);
  router.get(path, verifyApiClientCredentials, ItrCheckController.verifyItrCheck);
});

// Also support base mounted paths when router is mounted at /verify/itr-check or /itr-check
router.post('/', verifyApiClientCredentials, ItrCheckController.verifyItrCheck);
router.get('/', verifyApiClientCredentials, ItrCheckController.verifyItrCheck);

export default router;
