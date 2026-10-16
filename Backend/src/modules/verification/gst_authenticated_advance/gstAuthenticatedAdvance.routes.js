import { Router } from 'express';
import { GstAuthenticatedAdvanceController } from './gstAuthenticatedAdvance.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

const supportedPaths = [
  '/',
  '/verify/gst-authenticated-advance',
  '/api/v1/verify/gst-authenticated-advance',
  '/gst-authenticated-advance',
  '/api/v1/gst-authenticated-advance',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, GstAuthenticatedAdvanceController.verify);
  router.get(path, verifyApiClientCredentials, GstAuthenticatedAdvanceController.verify);
});

export default router;
