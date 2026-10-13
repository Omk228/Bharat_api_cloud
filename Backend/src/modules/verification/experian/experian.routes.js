import { Router } from 'express';
import { ExperianController } from './experian.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Experian Credit Report Routes
 * 1. Direct provider path: POST /srv2/credit-report/experian
 * 2. Versioned API path: POST /api/v1/srv2/credit-report/experian
 * 3. Short path: POST /api/v1/credit-report/experian
 * 4. White-labeled PDF Stream/Proxy: GET /api/v1/credit-report/experian/pdf and GET /srv2/credit-report/experian/pdf
 */
router.post(
  '/srv2/credit-report/experian',
  verifyApiClientCredentials,
  ExperianController.verifyExperianCreditReport
);

router.post(
  '/api/v1/srv2/credit-report/experian',
  verifyApiClientCredentials,
  ExperianController.verifyExperianCreditReport
);

router.post(
  '/api/v1/credit-report/experian',
  verifyApiClientCredentials,
  ExperianController.verifyExperianCreditReport
);

router.post(
  '/credit-report/experian',
  verifyApiClientCredentials,
  ExperianController.verifyExperianCreditReport
);

// PDF Stream Endpoints
router.get(
  '/api/v1/credit-report/experian/pdf',
  ExperianController.getExperianPdf
);

router.get(
  '/srv2/credit-report/experian/pdf',
  ExperianController.getExperianPdf
);

router.get(
  '/credit-report/experian/pdf',
  ExperianController.getExperianPdf
);

// Sanitized Bundle Endpoint for White-labeled SPA execution
router.get(
  '/api/v1/credit-report/experian/proxy-bundle.js',
  ExperianController.getProxyBundle
);

router.get(
  '/srv2/credit-report/experian/proxy-bundle.js',
  ExperianController.getProxyBundle
);

router.get(
  '/credit-report/experian/proxy-bundle.js',
  ExperianController.getProxyBundle
);

export default router;
