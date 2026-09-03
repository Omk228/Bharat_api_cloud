import { Router } from 'express';
import GeocodingController from './geocoding.controller.js';
import verifyApiClientCredentials from '../credentials/apiAuth.middleware.js';

const router = Router();

// Enforce Bharat API Cloud credentials (api_id, api_key, token_id)
router.use(verifyApiClientCredentials);

// GET & POST / (query params or body)
router.get('/', GeocodingController.reverseGeocode);
router.post('/', GeocodingController.reverseGeocode);

// GET & POST /reverse
router.get('/reverse', GeocodingController.reverseGeocode);
router.post('/reverse', GeocodingController.reverseGeocode);

// GET /:lat/:lon (e.g. /28.6139/77.2090)
router.get('/:lat/:lon', GeocodingController.reverseGeocode);

export default router;
