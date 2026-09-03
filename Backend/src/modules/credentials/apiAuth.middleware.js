import crypto from 'node:crypto';
import CredentialService from './credential.service.js';
import CacheService from '../../core/cache/cache.service.js';
import { dbPool } from '../../core/config/db.config.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

/**
 * High-Speed Cached Middleware to authenticate public API requests (<0.5ms on Cache Hit)
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

  const cleanApiId = String(api_id).trim();
  const cleanApiKey = String(api_key).trim();
  const cleanTokenId = String(token_id).trim();

  try {
    // 1. Check in High-Speed Dual-Layer Cache first (<0.5ms)
    const cachedCred = await CacheService.getAuth(cleanApiId, cleanApiKey);

    if (cachedCred) {
      if (!cachedCred.user_active) {
        return res.status(403).json({
          http_response_code: 403,
          result_code: 103,
          request_id: `req_${Date.now()}`,
          client_ref_num: req.body.client_ref_num || null,
          message: 'Account is suspended or deactivated.',
          status_message: 'Authentication failed',
          result: null
        });
      }

      // Timing-safe constant-time comparison
      const expectedBuf = Buffer.from(cachedCred.token_id);
      const providedBuf = Buffer.from(cleanTokenId);

      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        // Fetch real-time live wallet balance from DB
        const [[userRow]] = await dbPool.query('SELECT wallet_balance FROM users WHERE id = ?', [cachedCred.user_id]);
        const currentBalance = parseFloat(userRow?.wallet_balance ?? cachedCred.wallet_balance ?? '0.00');

        req.apiClient = {
          user_id: cachedCred.user_id,
          credential_id: cachedCred.credential_id,
          environment: cachedCred.environment,
          plan: cachedCred.plan,
          wallet_balance: currentBalance,
          client_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
        };
        return next();
      }
    }

    // 2. Cache Miss: Query Database via Service
    const cred = await CredentialService.validateClientAuth({
      api_id: cleanApiId,
      api_key: cleanApiKey,
      token_id: cleanTokenId
    });

    const clientPayload = {
      user_id: cred.user_id,
      credential_id: cred.id,
      token_id: cred.token_id,
      environment: cred.environment,
      plan: cred.plan,
      user_active: cred.user_active,
      wallet_balance: parseFloat(cred.wallet_balance || '0.00'),
      client_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
    };

    // Store in Cache for 15 minutes (900 seconds)
    CacheService.setAuth(cleanApiId, cleanApiKey, clientPayload, 900).catch(() => {});

    // Attach client & credential details to request
    req.apiClient = clientPayload;

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
