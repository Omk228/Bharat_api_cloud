import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected Routes
router.get('/me', verifyJwt, authController.getMe);

export default router;
