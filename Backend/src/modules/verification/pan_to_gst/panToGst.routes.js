import { Router } from 'express';
import { PanToGstController } from './panToGst.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * PAN to GST Verification Routes
 * Supported paths:
 * 1. POST /verify/pan-to-gst & POST /api/v1/verify/pan-to-gst
 * 2. POST /pan-to-gst & POST /api/v1/pan-to-gst
 * 3. GET /verify/pan-to-gst & GET /api/v1/verify/pan-to-gst (for test params)
 */
const supportedPaths = [
  '/verify/pan-to-gst',
  '/api/v1/verify/pan-to-gst',
  '/pan-to-gst',
  '/api/v1/pan-to-gst',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, PanToGstController.verifyPanToGst);
  router.get(path, verifyApiClientCredentials, PanToGstController.verifyPanToGst);
});

// Also support base mounted paths when router is mounted at /verify/pan-to-gst or /pan-to-gst
router.post('/', verifyApiClientCredentials, PanToGstController.verifyPanToGst);
router.get('/', verifyApiClientCredentials, PanToGstController.verifyPanToGst);

export default router;
