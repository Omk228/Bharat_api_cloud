import { Router } from 'express';
import { DthOperatorController } from './dth.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * DTH Operator Check Routes
 */
const supportedPaths = [
  '/verify/dth-operator',
  '/api/v1/verify/dth-operator',
  '/verify/dth-operator-check',
  '/api/v1/verify/dth-operator-check',
  '/dth/operator-check',
  '/api/v1/dth/operator-check',
  '/verify/dth',
  '/api/v1/verify/dth',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, DthOperatorController.checkDthOperator);
  router.get(path, verifyApiClientCredentials, DthOperatorController.checkDthOperator);
});

export default router;
