import { Router } from 'express';
import { CrifController } from './crif.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * CRIF High Mark Credit Score V4 Routes
 * 1. Direct provider path: POST /crif/Credit-ScoreV4
 * 2. Versioned API path: POST /api/v1/crif/Credit-ScoreV4
 * 3. PDF Report View/Download: GET /api/v1/reports/crif/:token and GET /reports/crif/:token
 */
router.post(
  '/crif/Credit-ScoreV4',
  verifyApiClientCredentials,
  CrifController.verifyCrifScore
);

router.post(
  '/api/v1/crif/Credit-ScoreV4',
  verifyApiClientCredentials,
  CrifController.verifyCrifScore
);

router.post(
  '/Credit-ScoreV4',
  verifyApiClientCredentials,
  CrifController.verifyCrifScore
);

router.post(
  '/',
  verifyApiClientCredentials,
  CrifController.verifyCrifScore
);

router.get(
  '/api/v1/reports/crif/:token',
  CrifController.getPdfReport
);

router.get(
  '/reports/crif/:token',
  CrifController.getPdfReport
);

export default router;
