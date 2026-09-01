import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import credentialRoutes from './credential.routes.js';
import panRoutes from './pan.routes.js';

const apiRouter = Router();

// Mount sub-routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/credentials', credentialRoutes);
apiRouter.use('/', panRoutes);

export default apiRouter;
