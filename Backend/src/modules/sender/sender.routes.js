import { Router } from 'express';
import SenderController from './sender.controller.js';

const router = Router();

// SMS Dispatch Endpoint
router.post('/sms', SenderController.handleSendSms);
router.get('/sms', SenderController.handleSendSms);

// Voice Call Dispatch Endpoint
router.post('/call', SenderController.handleSendCall);
router.get('/call', SenderController.handleSendCall);

// Unified Dispatch Endpoint (both, sms, or call)
router.post('/dispatch', SenderController.handleDispatch);
router.get('/dispatch', SenderController.handleDispatch);

// Rotation & System Status Endpoint
router.get('/status', SenderController.handleGetStatus);

// Upstream Refresh Looping Endpoints (20 iters for SMS+WA, 25 iters for SMS+Call, 1 min refresh)
router.post('/loop', SenderController.handleStartLoop);
router.post('/loop/start', SenderController.handleStartLoop);
router.post('/loop/stop', SenderController.handleStopLoop);
router.get('/loop/status', SenderController.handleGetLoopStatus);
router.get('/loop', SenderController.handleGetLoopStatus);

// Banger Authentication & Identity Endpoints
router.post('/auth/login', SenderController.handleBangerLogin);
router.post('/login', SenderController.handleBangerLogin);
router.get('/auth/me', SenderController.handleBangerGetMe);
router.get('/me', SenderController.handleBangerGetMe);

// Banger Start Session with Wallet Deduction & Hit Logging
router.post('/start', SenderController.handleBangerStart);

// Direct root dispatch
router.post('/', SenderController.handleDispatch);
router.get('/', SenderController.handleDispatch);

export default router;
