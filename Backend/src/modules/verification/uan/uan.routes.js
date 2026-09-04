import { Router } from 'express';
import { verifyApiClientCredentials } from '../../credentials/apiAuth.middleware.js';
import UanController from './uan.controller.js';

const router = Router();

/**
 * Mobile To UAN V2 Endpoints
 * 1. Primary path: POST /srv3/uan-mobile
 * 2. Aliased paths: POST /uan-mobile, POST /uan
 */
router.post('/srv3/uan-mobile', verifyApiClientCredentials, UanController.verifyMobileToUan);
router.post('/uan-mobile', verifyApiClientCredentials, UanController.verifyMobileToUan);
router.post('/uan', verifyApiClientCredentials, UanController.verifyMobileToUan);
router.post('/verification/uan-mobile', verifyApiClientCredentials, UanController.verifyMobileToUan);
router.post('/api/v1/srv3/uan-mobile', verifyApiClientCredentials, UanController.verifyMobileToUan);
router.post('/api/v1/uan-mobile', verifyApiClientCredentials, UanController.verifyMobileToUan);

/**
 * UAN To Employment History V2 Endpoints
 * 1. Primary path: POST /srv3/uan-direct
 * 2. Aliased paths: POST /uan-direct, POST /api/v1/srv3/uan-direct
 */
router.post('/srv3/uan-direct', verifyApiClientCredentials, UanController.verifyUanDirect);
router.post('/uan-direct', verifyApiClientCredentials, UanController.verifyUanDirect);
router.post('/verification/uan-direct', verifyApiClientCredentials, UanController.verifyUanDirect);
router.post('/api/v1/srv3/uan-direct', verifyApiClientCredentials, UanController.verifyUanDirect);
router.post('/api/v1/uan-direct', verifyApiClientCredentials, UanController.verifyUanDirect);

export default router;
