import { Router } from 'express';
import GeocodingController from './geocoding.controller.js';
import verifyApiClientCredentials from '../credentials/apiAuth.middleware.js';

const router = Router();

// Enforce Bharat API Cloud credentials per-route (api_id, api_key, token_id)

// GET & POST / (query params or body)
router.get('/', verifyApiClientCredentials, GeocodingController.reverseGeocode);
router.post('/', verifyApiClientCredentials, GeocodingController.reverseGeocode);

// GET & POST /reverse
router.get('/reverse', verifyApiClientCredentials, GeocodingController.reverseGeocode);
router.post('/reverse', verifyApiClientCredentials, GeocodingController.reverseGeocode);

// GET /:lat/:lon (e.g. /28.6139/77.2090)
router.get('/:lat/:lon', verifyApiClientCredentials, GeocodingController.reverseGeocode);

export default router;
