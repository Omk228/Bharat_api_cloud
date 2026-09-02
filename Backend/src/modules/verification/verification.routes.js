import { Router } from 'express';
import panRoutes from './pan/pan.routes.js';
import aadhaarRoutes from './aadhaar/aadhaar.routes.js';
import bankRoutes from './bank/bank.routes.js';

const router = Router();

// Mount Verification Sub-Domains
router.use('/', panRoutes);
router.use('/', aadhaarRoutes);
router.use('/', bankRoutes);

export default router;
