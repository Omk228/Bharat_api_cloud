import CredentialService from '../services/credential.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class CredentialController {
  /**
   * Get user's credentials
   */
  static getCredentials = asyncHandler(async (req, res) => {
    const userId = req.user.id;
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
