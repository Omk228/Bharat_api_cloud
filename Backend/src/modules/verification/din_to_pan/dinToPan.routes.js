import { Router } from 'express';
import { DinToPanController } from './dinToPan.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * DIN to PAN Verification Routes
 * Supported paths:
 * 1. POST /verify/din-to-pan & POST /api/v1/verify/din-to-pan
 * 2. POST /din-to-pan & POST /api/v1/din-to-pan
 * 3. GET /verify/din-to-pan & GET /api/v1/verify/din-to-pan (for console / test params)
 */
const supportedPaths = [
  '/verify/din-to-pan',
  '/api/v1/verify/din-to-pan',
  '/din-to-pan',
  '/api/v1/din-to-pan',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, DinToPanController.verifyDinToPan);
  router.get(path, verifyApiClientCredentials, DinToPanController.verifyDinToPan);
});

// Also support base mounted paths when router is mounted at /verify/din-to-pan or /din-to-pan
router.post('/', verifyApiClientCredentials, DinToPanController.verifyDinToPan);
router.get('/', verifyApiClientCredentials, DinToPanController.verifyDinToPan);

export default router;
