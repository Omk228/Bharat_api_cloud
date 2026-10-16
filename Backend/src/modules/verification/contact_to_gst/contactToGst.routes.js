import { Router } from 'express';
import { ContactToGstController } from './contactToGst.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Contact to GST Verification Routes
 * Supported paths:
 * 1. POST /verify/contact-to-gst & POST /api/v1/verify/contact-to-gst
 * 2. POST /contact-to-gst & POST /api/v1/contact-to-gst
 * 3. GET /verify/contact-to-gst & GET /api/v1/verify/contact-to-gst (for console / test query params)
 */
const supportedPaths = [
  '/verify/contact-to-gst',
  '/api/v1/verify/contact-to-gst',
  '/contact-to-gst',
  '/api/v1/contact-to-gst',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, ContactToGstController.verifyContactToGst);
  router.get(path, verifyApiClientCredentials, ContactToGstController.verifyContactToGst);
});

// Also support base mounted paths when router is mounted at /verify/contact-to-gst or /contact-to-gst
router.post('/', verifyApiClientCredentials, ContactToGstController.verifyContactToGst);
router.get('/', verifyApiClientCredentials, ContactToGstController.verifyContactToGst);

export default router;
