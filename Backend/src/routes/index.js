import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import credentialRoutes from '../modules/credentials/credential.routes.js';
import panRoutes from '../modules/verification/pan/pan.routes.js';
import aadhaarRoutes from '../modules/verification/aadhaar/aadhaar.routes.js';

const apiRouter = Router();

// Mount modular sub-routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/credentials', credentialRoutes);
apiRouter.use('/', panRoutes);
apiRouter.use('/', aadhaarRoutes);

export default apiRouter;
