import { Router } from 'express';
import { authController } from './auth.controller.js';
import { verifyJwt } from './auth.middleware.js';

const router = Router();

// Public Routes
router.post('/register', authController.register);
router.post('/signup', authController.register);
router.post('/login', authController.login);

// Protected Routes
router.get('/me', verifyJwt, authController.getMe);
router.put('/profile', verifyJwt, authController.updateProfile);

export default router;
