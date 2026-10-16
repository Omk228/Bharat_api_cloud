import { Router } from 'express';
import { GstToContactController } from './gstToContact.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * GST to Contact Details Verification Routes
 * Supported paths:
 * 1. POST /verify/gst-to-contact & POST /api/v1/verify/gst-to-contact
 * 2. POST /gst-to-contact & POST /api/v1/gst-to-contact
 * 3. GET /verify/gst-to-contact & GET /api/v1/verify/gst-to-contact (for test params)
 */
const supportedPaths = [
  '/verify/gst-to-contact',
  '/api/v1/verify/gst-to-contact',
  '/gst-to-contact',
  '/api/v1/gst-to-contact',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, GstToContactController.verifyGstToContact);
  router.get(path, verifyApiClientCredentials, GstToContactController.verifyGstToContact);
});

// Also support base mounted paths when router is mounted at /verify/gst-to-contact or /gst-to-contact
router.post('/', verifyApiClientCredentials, GstToContactController.verifyGstToContact);
router.get('/', verifyApiClientCredentials, GstToContactController.verifyGstToContact);

export default router;
