import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const apiRouter = Router();

// Mount sub-routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);

export default apiRouter;
