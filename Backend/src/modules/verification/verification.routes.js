import { Router } from 'express';
import panRoutes from './pan/pan.routes.js';
import aadhaarRoutes from './aadhaar/aadhaar.routes.js';
import bankRoutes from './bank/bank.routes.js';
import prefillRoutes from './prefill/prefill.routes.js';
import nameFinderRoutes from './name_finder/nameFinder.routes.js';
import mobileUpiRoutes from './mobile_upi/mobileUpi.routes.js';
import digilockerRoutes from './digilocker/digilocker.routes.js';

const router = Router();

// Mount Verification Sub-Domains
router.use('/', panRoutes);
router.use('/', aadhaarRoutes);
router.use('/', bankRoutes);
router.use('/', prefillRoutes);
router.use('/', nameFinderRoutes);
router.use('/', mobileUpiRoutes);
router.use('/', digilockerRoutes);

export default router;
