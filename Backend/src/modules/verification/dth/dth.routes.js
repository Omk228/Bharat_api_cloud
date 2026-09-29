import { Router } from 'express';
import { DthOperatorController } from './dth.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * DTH Operator Check Routes
 */
const supportedCheckPaths = [
  '/verify/dth-operator',
  '/api/v1/verify/dth-operator',
  '/verify/dth-operator-check',
  '/api/v1/verify/dth-operator-check',
  '/dth/operator-check',
  '/api/v1/dth/operator-check',
  '/verify/dth',
  '/api/v1/verify/dth',
];

supportedCheckPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, DthOperatorController.checkDthOperator);
  router.get(path, verifyApiClientCredentials, DthOperatorController.checkDthOperator);
});

/**
 * DTH Operator Advance Routes (Customer Info, Plan, Balance, Address)
 */
const supportedAdvancePaths = [
  '/verify/dth-advance',
  '/api/v1/verify/dth-advance',
  '/verify/dth-operator-advance',
  '/api/v1/verify/dth-operator-advance',
  '/dth/info',
  '/api/v1/dth/info',
];

supportedAdvancePaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, DthOperatorController.checkDthAdvance);
  router.get(path, verifyApiClientCredentials, DthOperatorController.checkDthAdvance);
});

export default router;
