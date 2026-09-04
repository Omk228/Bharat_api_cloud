import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import credentialRoutes from '../modules/credentials/credential.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import panRoutes from '../modules/verification/pan/pan.routes.js';
import aadhaarRoutes from '../modules/verification/aadhaar/aadhaar.routes.js';
import bankRoutes from '../modules/verification/bank/bank.routes.js';
import prefillRoutes from '../modules/verification/prefill/prefill.routes.js';
import nameFinderRoutes from '../modules/verification/name_finder/nameFinder.routes.js';
import apilayerRoutes from '../modules/apilayer/apilayer.routes.js';
import geocodingRoutes from '../modules/geocoding/geocoding.routes.js';
import idfyRoutes from '../modules/idfy/idfy.routes.js';
import uanRoutes from '../modules/verification/uan/uan.routes.js';
import mobileUpiRoutes from '../modules/verification/mobile_upi/mobileUpi.routes.js';

const apiRouter = Router();

// Mount modular sub-routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/credentials', credentialRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/', panRoutes);
apiRouter.use('/', aadhaarRoutes);
apiRouter.use('/', bankRoutes);
apiRouter.use('/', prefillRoutes);
apiRouter.use('/', nameFinderRoutes);
apiRouter.use('/', uanRoutes);
apiRouter.use('/srv3/uan-mobile', uanRoutes);
apiRouter.use('/uan-mobile', uanRoutes);
apiRouter.use('/uan', uanRoutes);
apiRouter.use('/srv3/uan-direct', uanRoutes);
apiRouter.use('/uan-direct', uanRoutes);
apiRouter.use('/', mobileUpiRoutes);
apiRouter.use('/', apilayerRoutes);
apiRouter.use('/idfy', idfyRoutes);
apiRouter.use('/validate_bank_account', idfyRoutes);
apiRouter.use('/validate-bank-account', idfyRoutes);
apiRouter.use('/', idfyRoutes);
apiRouter.use('/reverse-geocode', geocodingRoutes);
apiRouter.use('/reverse', geocodingRoutes);
apiRouter.use('/geocode', geocodingRoutes);
apiRouter.use('/', geocodingRoutes);

export default apiRouter;
