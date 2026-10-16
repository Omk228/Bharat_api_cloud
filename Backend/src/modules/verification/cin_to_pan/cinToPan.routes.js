import { Router } from 'express';
import { CinToPanController } from './cinToPan.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * CIN to PAN Verification Routes
 * Supported paths:
 * 1. POST /verify/cin-to-pan & POST /api/v1/verify/cin-to-pan
 * 2. POST /cin-to-pan & POST /api/v1/cin-to-pan
 * 3. GET /verify/cin-to-pan & GET /api/v1/verify/cin-to-pan (for console / test params)
 */
const supportedPaths = [
  '/verify/cin-to-pan',
  '/api/v1/verify/cin-to-pan',
  '/cin-to-pan',
  '/api/v1/cin-to-pan',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, CinToPanController.verifyCinToPan);
  router.get(path, verifyApiClientCredentials, CinToPanController.verifyCinToPan);
});

// Also support base mounted paths when router is mounted at /verify/cin-to-pan or /cin-to-pan
router.post('/', verifyApiClientCredentials, CinToPanController.verifyCinToPan);
router.get('/', verifyApiClientCredentials, CinToPanController.verifyCinToPan);

export default router;
