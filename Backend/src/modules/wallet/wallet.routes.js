import { Router } from 'express';
import { walletController } from './wallet.controller.js';
import { verifyJwt } from '../auth/auth.middleware.js';

const router = Router();

// All wallet routes are protected and require user authentication
router.get('/balance', verifyJwt, walletController.getBalance);
router.get('/transactions', verifyJwt, walletController.getTransactions);
router.get('/logs', verifyJwt, walletController.getHitLogs);
router.post('/topup', verifyJwt, walletController.topup);

export default router;
