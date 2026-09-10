import { Router } from 'express';
import PricingController from './pricing.controller.js';

const router = Router();

// Flexible endpoint - supports Bearer JWT, API Key headers, or public default catalog
router.get('/', PricingController.getPricing);
router.get('/my-pricing', PricingController.getPricing);

// Admin assignment endpoints
router.post('/assign', PricingController.assignApi);
router.post('/bulk-assign', PricingController.bulkAssign);

export default router;
