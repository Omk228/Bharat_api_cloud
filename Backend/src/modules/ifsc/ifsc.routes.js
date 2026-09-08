import { Router } from 'express';
import IfscController from './ifsc.controller.js';
import { verifyApiClientCredentials } from '../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Razorpay IFSC API Routes (Protected strictly by Bharat API Cloud Credentials)
 * Requires mandatory api_id, api_key, token_id in headers, query parameters, or body.
 */

// Explicit IFSC paths
router.get('/ifsc/:ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.get('/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.post('/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);

// Banking category alias matching UI path /bank/ifsc/{ifsc}
router.get('/bank/ifsc/:ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.get('/bank/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.post('/bank/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);

// Verification sub-paths for consistency
router.get('/verification/ifsc/:ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.get('/verification/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);
router.post('/verification/ifsc', verifyApiClientCredentials, IfscController.getIfscDetails);

// Root path matching Razorpay https://ifsc.razorpay.com/:ifsc directly
// Only matches 11-character alphanumeric codes or IFSC-like path params, skipping internal resources
router.get('/:ifsc', (req, res, next) => {
  const p = (req.params.ifsc || '').trim().toUpperCase();
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(p)) {
    return next('route');
  }
  next();
}, verifyApiClientCredentials, IfscController.getIfscDetails);

export default router;
