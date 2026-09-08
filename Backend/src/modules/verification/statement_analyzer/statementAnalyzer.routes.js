import { Router } from 'express';
import StatementAnalyzerController from './statementAnalyzer.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

// Primary & Canonical Routes
router.post('/srv2/statement-upload', verifyApiClientCredentials, StatementAnalyzerController.handleRequest);
router.post('/srv2/statement-analyzer', verifyApiClientCredentials, StatementAnalyzerController.handleRequest);
router.post('/statement-upload', verifyApiClientCredentials, StatementAnalyzerController.handleRequest);
router.post('/statement-analyzer', verifyApiClientCredentials, StatementAnalyzerController.handleRequest);

export default router;
