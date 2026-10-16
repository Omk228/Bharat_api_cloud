import { Router } from 'express';
import { GstAuthenticatedAdvanceController } from './gstAuthenticatedAdvance.controller.js';
import { authenticateClient } from '../../../core/middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticateClient, GstAuthenticatedAdvanceController.verify);

export default router;
