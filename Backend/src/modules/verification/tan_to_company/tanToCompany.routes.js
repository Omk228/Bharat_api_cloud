import { Router } from 'express';
import { TanToCompanyController } from './tanToCompany.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * TAN to Company Verification Routes
 * Supported paths:
 * 1. POST /verify/tan-to-company & POST /api/v1/verify/tan-to-company
 * 2. POST /tan-to-company & POST /api/v1/tan-to-company
 * 3. GET /verify/tan-to-company & GET /api/v1/verify/tan-to-company (for console / test params)
 */
const supportedPaths = [
  '/verify/tan-to-company',
  '/api/v1/verify/tan-to-company',
  '/tan-to-company',
  '/api/v1/tan-to-company',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, TanToCompanyController.verifyTanToCompany);
  router.get(path, verifyApiClientCredentials, TanToCompanyController.verifyTanToCompany);
});

// Also support base mounted paths when router is mounted at /verify/tan-to-company or /tan-to-company
router.post('/', verifyApiClientCredentials, TanToCompanyController.verifyTanToCompany);
router.get('/', verifyApiClientCredentials, TanToCompanyController.verifyTanToCompany);

export default router;
