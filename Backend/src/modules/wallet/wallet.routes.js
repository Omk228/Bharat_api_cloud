import { Router } from 'express';
import { walletController } from './wallet.controller.js';
import { verifyJwt } from '../auth/auth.middleware.js';

const router = Router();

// All wallet routes
router.get('/balance', verifyJwt, walletController.getBalance);
router.get('/transactions', verifyJwt, walletController.getTransactions);
router.get('/logs', verifyJwt, walletController.getHitLogs);
router.post('/topup', verifyJwt, walletController.topup);
router.post('/recharge-request', verifyJwt, walletController.submitRechargeRequest);

// Admin wallet verification & management endpoints
router.get('/admin/recharges', walletController.getAdminRecharges);
router.post('/admin/recharges/:id/approve', walletController.approveRecharge);
router.post('/admin/recharges/:id/reject', walletController.rejectRecharge);

export default router;
