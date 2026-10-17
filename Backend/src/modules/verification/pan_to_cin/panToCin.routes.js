import { Router } from 'express';
import { PanToCinController } from './panToCin.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * PAN to CIN Verification Routes
 * Supported paths:
 * 1. POST /verify/pan-to-cin & POST /api/v1/verify/pan-to-cin
 * 2. POST /pan-to-cin & POST /api/v1/pan-to-cin
 * 3. GET /verify/pan-to-cin & GET /api/v1/verify/pan-to-cin (for console / test params)
 */
const supportedPaths = [
  '/verify/pan-to-cin',
  '/api/v1/verify/pan-to-cin',
  '/pan-to-cin',
  '/api/v1/pan-to-cin',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, PanToCinController.verifyPanToCin);
  router.get(path, verifyApiClientCredentials, PanToCinController.verifyPanToCin);
});

// Also support base mounted paths when router is mounted at /verify/pan-to-cin or /pan-to-cin
router.post('/', verifyApiClientCredentials, PanToCinController.verifyPanToCin);
router.get('/', verifyApiClientCredentials, PanToCinController.verifyPanToCin);

export default router;
