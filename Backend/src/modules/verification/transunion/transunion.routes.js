import { Router } from 'express';
import { TransunionController } from './transunion.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * TransUnion CIBIL Score Hybrid Routes
 * 1. Direct provider path: POST /srv5/transunion-Score-Hybrid
 * 2. Versioned API path: POST /api/v1/srv5/transunion-Score-Hybrid
 * 3. PDF Report View/Download: GET /api/v1/reports/cibil/:token and GET /reports/cibil/:token
 */
router.post(
  '/srv5/transunion-Score-Hybrid',
  verifyApiClientCredentials,
  TransunionController.verifyTransunion
);

router.post(
  '/api/v1/srv5/transunion-Score-Hybrid',
  verifyApiClientCredentials,
  TransunionController.verifyTransunion
);

router.get(
  '/api/v1/reports/cibil/:token',
  TransunionController.getPdfReport
);

router.get(
  '/reports/cibil/:token',
  TransunionController.getPdfReport
);

export default router;
