import { Router } from 'express';
import CredentialController from '../controllers/credential.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Dashboard protected routes
router.use(verifyJwt);

router.get('/', CredentialController.getCredentials);
router.post('/generate', CredentialController.generateCredentials);
router.post('/rotate', CredentialController.rotateToken);
router.delete('/:id', CredentialController.revokeCredential);

export default router;
