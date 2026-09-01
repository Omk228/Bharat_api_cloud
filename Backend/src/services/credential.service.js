import crypto from 'node:crypto';
import CredentialModel from '../models/credential.model.js';
import ApiError from '../utils/apiError.js';

export class CredentialService {
  /**
   * Generates cryptographically secure API credentials for a user
   */
  static async generateCredentials({ userId, environment = 'sandbox', label = 'Default Key' }) {
    // 1. Re-use user's existing common API ID if they already have one
    const existing = await CredentialModel.findByUserId(userId);
    let apiId = existing && existing.length > 0 ? existing[0].api_id : null;

    // If no existing API ID for this user, generate a single persistent common APID
    if (!apiId) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      apiId = `APID${randomSuffix}`;
    }

    // 2. Generate API Key: Standard UUID v4
    const apiKey = crypto.randomUUID();

    // 3. Generate Token ID: 32-character Base62/Base64url high-entropy string
    const rawToken = crypto.randomBytes(24).toString('base64url');

    // 4. Token preview for masked display in dashboards
    const tokenPreview = `${rawToken.substring(0, 4)}...${rawToken.substring(rawToken.length - 4)}`;

    const credential = await CredentialModel.create({
      userId,
      apiId,
      apiKey,
      tokenId: rawToken,
      tokenIdPreview: tokenPreview,
      environment: environment === 'production' ? 'production' : 'sandbox',
      label: label.trim() || 'Default Key'
    });

    return credential;
  }

  /**
   * Get all active credentials for a user
   */
  static async getUserCredentials(userId) {
    const creds = await CredentialModel.findByUserId(userId);
    // If user has no credentials yet, auto-create a default Sandbox pair
    if (!creds || creds.length === 0) {
      const defaultCred = await this.generateCredentials({
        userId,
        environment: 'sandbox',
        label: 'Default Sandbox Key'
      });
      return [defaultCred];
    }
    return creds;
  }

  /**
   * Rotate a user's Token ID
   */
  static async rotateToken({ userId, credentialId }) {
    const newToken = crypto.randomBytes(24).toString('base64url');
    const tokenPreview = `${newToken.substring(0, 4)}...${newToken.substring(newToken.length - 4)}`;

    const updated = await CredentialModel.rotateToken(credentialId, userId, newToken, tokenPreview);
    if (!updated) {
      throw new ApiError(404, 'Credential not found or unauthorized to rotate.');
    }

    return {
      credential_id: credentialId,
      token_id: newToken,
      token_id_preview: tokenPreview,
      rotated_at: new Date().toISOString()
    };
  }

  /**
   * Revoke credentials
   */
  static async revokeCredentials({ userId, credentialId }) {
    const revoked = await CredentialModel.revoke(credentialId, userId);
    if (!revoked) {
      throw new ApiError(404, 'Credential not found or already revoked.');
    }
    return { success: true, message: 'API Credentials revoked successfully.' };
  }

  /**
   * Validate client credentials on incoming API calls
   */
  static async validateClientAuth({ api_id, api_key, token_id }) {
    if (!api_id || !api_key || !token_id) {
      throw new ApiError(401, 'Missing API credentials. Required: api_id, api_key, token_id in body or headers.');
    }

    const cred = await CredentialModel.findActiveByApiIdAndKey(api_id.trim(), api_key.trim());
    if (!cred) {
      throw new ApiError(401, 'Invalid API ID or API Key.');
    }

    if (!cred.user_active) {
      throw new ApiError(403, 'Account is suspended or deactivated.');
    }

    // Compare Token ID in constant time
    const expectedToken = cred.token_id;
    const providedToken = token_id.trim();

    const expectedBuf = Buffer.from(expectedToken);
    const providedBuf = Buffer.from(providedToken);

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      throw new ApiError(401, 'Invalid Token ID authentication failure.');
    }

    // Touch last used timestamp asynchronously
    CredentialModel.touchLastUsed(cred.id).catch(() => {});

    return cred;
  }
}

export default CredentialService;
