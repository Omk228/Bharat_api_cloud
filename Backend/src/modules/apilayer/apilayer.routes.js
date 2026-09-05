import { Router } from 'express';
import ApiLayerController from './apilayer.controller.js';
import verifyApiClientCredentials from '../credentials/apiAuth.middleware.js';

const router = Router();

// Enforce Bharat API Cloud credentials per route (api_id, api_key, token_id)

/**
 * APILAYER IP Geolocation Endpoints
 * Supports both GET and POST for easy Postman testing
 */

// Requester IP Lookup (/check)
router.get('/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);
router.post('/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);

// Dedicated IP routes
router.get('/ip/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);
router.post('/ip/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);

router.get('/ip/lookup', verifyApiClientCredentials, ApiLayerController.lookupIp);
router.post('/ip/lookup', verifyApiClientCredentials, ApiLayerController.lookupIp);

router.get('/ip/:ip', verifyApiClientCredentials, ApiLayerController.lookupIp);
router.post('/ip/:ip', verifyApiClientCredentials, ApiLayerController.lookupIp);

// API v1 compatibility paths
router.get('/api/v1/ip/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);
router.post('/api/v1/ip/check', verifyApiClientCredentials, ApiLayerController.checkRequesterIp);

router.get('/api/v1/ip/lookup', verifyApiClientCredentials, ApiLayerController.lookupIp);
router.post('/api/v1/ip/lookup', verifyApiClientCredentials, ApiLayerController.lookupIp);

router.get('/api/v1/ip/:ip', verifyApiClientCredentials, ApiLayerController.lookupIp);
router.post('/api/v1/ip/:ip', verifyApiClientCredentials, ApiLayerController.lookupIp);

export default router;
