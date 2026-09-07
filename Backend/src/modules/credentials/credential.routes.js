import { Router } from 'express';
import CredentialController from './credential.controller.js';
import { verifyJwt, optionalJwt } from '../auth/auth.middleware.js';

const router = Router();

// GET allows optional JWT or email lookup for seamless console integration
router.get('/', optionalJwt, CredentialController.getCredentials);

// Mutating operations strictly require full verifyJwt
router.post('/generate', verifyJwt, CredentialController.generateCredentials);
router.post('/rotate', verifyJwt, CredentialController.rotateToken);
router.delete('/:id', verifyJwt, CredentialController.revokeCredential);

export default router;
