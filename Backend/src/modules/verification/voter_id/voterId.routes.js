import { Router } from 'express';
import { VoterIdController } from './voterId.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Voter ID (EPIC) Verification Routes
 * Supported paths:
 * 1. POST /verify/voter-id & POST /api/v1/verify/voter-id
 * 2. POST /voter-id & POST /api/v1/voter-id
 * 3. GET /verify/voter-id & GET /api/v1/verify/voter-id
 */
const supportedPaths = [
  '/verify/voter-id',
  '/api/v1/verify/voter-id',
  '/voter-id',
  '/api/v1/voter-id',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, VoterIdController.verifyVoterId);
  router.get(path, verifyApiClientCredentials, VoterIdController.verifyVoterId);
});

// Also support base mounted paths when router is mounted at /verify/voter-id or /voter-id
router.post('/', verifyApiClientCredentials, VoterIdController.verifyVoterId);
router.get('/', verifyApiClientCredentials, VoterIdController.verifyVoterId);

export default router;
