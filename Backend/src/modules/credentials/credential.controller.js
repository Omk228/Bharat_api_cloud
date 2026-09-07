import CredentialService from './credential.service.js';
import { ApiResponse } from '../../core/utils/apiResponse.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { userModel } from '../auth/user.model.js';

export class CredentialController {
  /**
   * Get user's credentials
   */
  static getCredentials = asyncHandler(async (req, res) => {
    let userId = req.user?.id;

    if (!userId) {
      const userEmail = req.headers['x-user-email'] || req.query.email;
      if (userEmail) {
        try {
          const user = await userModel.findByEmail(String(userEmail).trim().toLowerCase());
          if (user?.id) {
            userId = user.id;
          }
        } catch (err) {}
      }
    }

    if (!userId) {
      return ApiResponse.success(res, [], 'No active credentials');
    }

    const creds = await CredentialService.getUserCredentials(userId);
    return ApiResponse.success(res, creds, 'Credentials retrieved successfully');
  });

  /**
   * Generate new credentials (sandbox or production)
   */
  static generateCredentials = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { environment, label } = req.body;

    const credential = await CredentialService.generateCredentials({
      userId,
      environment: environment || 'sandbox',
      label: label || 'My Application Key'
    });

    return ApiResponse.created(res, credential, 'API credentials generated successfully');
  });

  /**
   * Rotate a Token ID
   */
  static rotateToken = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { credential_id } = req.body;

    const result = await CredentialService.rotateToken({
      userId,
      credentialId: credential_id
    });

    return ApiResponse.success(res, result, 'Token rotated successfully');
  });

  /**
   * Revoke credentials
   */
  static revokeCredential = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const credentialId = req.params.id;

    const result = await CredentialService.revokeCredentials({
      userId,
      credentialId
    });

    return ApiResponse.success(res, result, 'Credential revoked successfully');
  });
}

export default CredentialController;
