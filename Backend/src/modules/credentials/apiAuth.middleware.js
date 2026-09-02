import CredentialService from './credential.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

/**
 * Middleware to authenticate public API requests via API ID, API Key, and Token ID
 */
export const verifyApiClientCredentials = asyncHandler(async (req, res, next) => {
  // Extract credentials from body or custom headers
  const api_id = req.body.api_id || req.headers['x-api-id'];
  const api_key = req.body.api_key || req.headers['x-api-key'];
  const token_id = req.body.token_id || req.headers['x-token-id'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!api_id || !api_key || !token_id) {
    return res.status(401).json({
      http_response_code: 401,
      result_code: 103,
      request_id: `req_${Date.now()}`,
      client_ref_num: req.body.client_ref_num || null,
      message: 'Unauthorized: Missing required API credentials (api_id, api_key, token_id).',
      status_message: 'Authentication failed',
      result: null
    });
  }

  try {
    const cred = await CredentialService.validateClientAuth({
      api_id: String(api_id),
      api_key: String(api_key),
      token_id: String(token_id)
    });

    // Attach client & credential details to request
    req.apiClient = {
      user_id: cred.user_id,
      credential_id: cred.id,
      environment: cred.environment,
      plan: cred.plan,
      wallet_balance: parseFloat(cred.wallet_balance || '0.00'),
      client_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
    };

    next();
  } catch (error) {
    return res.status(401).json({
      http_response_code: 401,
      result_code: 103,
      request_id: `req_${Date.now()}`,
      client_ref_num: req.body.client_ref_num || null,
      message: error.message || 'Unauthorized API credentials.',
      status_message: 'Authentication failed',
      result: null
    });
  }
});

export default verifyApiClientCredentials;
