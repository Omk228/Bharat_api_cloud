import { Router } from 'express';
import PanVerificationController from './pan.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

// Public API routes authenticated via API ID, API Key, Token ID
router.post('/srv2/validation/pan', verifyApiClientCredentials, PanVerificationController.verifyPan);
router.post('/verify/pan', verifyApiClientCredentials, PanVerificationController.verifyPan);
router.post('/validation/pan', verifyApiClientCredentials, PanVerificationController.verifyPan);
router.post('/pan', verifyApiClientCredentials, PanVerificationController.verifyPan);

// Pan Details Plus Endpoints
router.post('/srv2/validation/pan/plus', verifyApiClientCredentials, PanVerificationController.verifyPanPlus);
router.post('/validation/pan/plus', verifyApiClientCredentials, PanVerificationController.verifyPanPlus);
router.post('/pan/plus', verifyApiClientCredentials, PanVerificationController.verifyPanPlus);
router.post('/verify/pan/plus', verifyApiClientCredentials, PanVerificationController.verifyPanPlus);

export default router;
