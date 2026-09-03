import { Router } from 'express';
import ApiLayerController from './apilayer.controller.js';

const router = Router();

/**
 * APILAYER IP Geolocation Endpoints
 * Supports both GET and POST for easy Postman testing
 */

// Requester IP Lookup (/check)
router.get('/check', ApiLayerController.checkRequesterIp);
router.post('/check', ApiLayerController.checkRequesterIp);

// Dedicated IP routes
router.get('/ip/check', ApiLayerController.checkRequesterIp);
router.post('/ip/check', ApiLayerController.checkRequesterIp);

router.get('/ip/lookup', ApiLayerController.lookupIp);
router.post('/ip/lookup', ApiLayerController.lookupIp);

router.get('/ip/:ip', ApiLayerController.lookupIp);
router.post('/ip/:ip', ApiLayerController.lookupIp);

// API v1 compatibility paths
router.get('/api/v1/ip/check', ApiLayerController.checkRequesterIp);
router.post('/api/v1/ip/check', ApiLayerController.checkRequesterIp);

router.get('/api/v1/ip/lookup', ApiLayerController.lookupIp);
router.post('/api/v1/ip/lookup', ApiLayerController.lookupIp);

router.get('/api/v1/ip/:ip', ApiLayerController.lookupIp);
router.post('/api/v1/ip/:ip', ApiLayerController.lookupIp);

export default router;
