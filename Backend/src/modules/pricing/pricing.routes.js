import { Router } from 'express';
import PricingController from './pricing.controller.js';

const router = Router();

// Flexible endpoint - supports Bearer JWT, API Key headers, or public default catalog
router.get('/', PricingController.getPricing);
router.get('/my-pricing', PricingController.getPricing);

export default router;
