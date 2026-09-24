import { Router } from 'express';
import { WorkEmailController } from './workEmail.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Work / Corporate Email Verifier Routes
 * Supported routes:
 * 1. POST /verify/work-email & POST /api/v1/verify/work-email
 * 2. POST /work-email/verify & POST /api/v1/work-email/verify
 * 3. POST /corporate-email/verify & POST /api/v1/corporate-email/verify
 * 4. POST /email/verify & POST /api/v1/email/verify
 * 5. GET /api/v1/verify/work-email (for easy query-param Postman testing)
 */
const supportedPaths = [
  '/verify/work-email',
  '/api/v1/verify/work-email',
  '/work-email/verify',
  '/api/v1/work-email/verify',
  '/corporate-email/verify',
  '/api/v1/corporate-email/verify',
  '/corp-email/verify',
  '/api/v1/corp-email/verify',
  '/email/verify',
  '/api/v1/email/verify',
  '/verify/corporate-email',
  '/api/v1/verify/corporate-email',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, WorkEmailController.verifyWorkEmail);
  router.get(path, verifyApiClientCredentials, WorkEmailController.verifyWorkEmail);
});

/**
 * Work Email Verifier Plus (WAY2API) Routes
 */
const plusPaths = [
  '/verify/work-email-plus',
  '/api/v1/verify/work-email-plus',
  '/work-email-plus/verify',
  '/api/v1/work-email-plus/verify',
  '/verify/work-email/plus',
  '/api/v1/verify/work-email/plus',
  '/work-email/plus',
  '/api/v1/work-email/plus',
  '/email/verify/plus',
  '/api/v1/email/verify/plus',
  '/email-verifier-plus',
  '/api/v1/email-verifier-plus',
];

plusPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, WorkEmailController.verifyWorkEmailPlus);
  router.get(path, verifyApiClientCredentials, WorkEmailController.verifyWorkEmailPlus);
});

export default router;
