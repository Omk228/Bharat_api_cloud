import { Router } from 'express';
import { MobileOperatorController } from './operator.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Mobile Operator & Circle Check Routes
 */
const supportedPaths = [
  '/verify/operator-circle',
  '/api/v1/verify/operator-circle',
  '/verify/mobile-operator',
  '/api/v1/verify/mobile-operator',
  '/operator-circle/check',
  '/api/v1/operator-circle/check',
  '/mobile-operator/check',
  '/api/v1/mobile-operator/check',
  '/verify/operator',
  '/api/v1/verify/operator',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, MobileOperatorController.checkMobileOperator);
  router.get(path, verifyApiClientCredentials, MobileOperatorController.checkMobileOperator);
});

export default router;
