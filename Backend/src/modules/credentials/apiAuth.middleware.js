import crypto from 'node:crypto';
import CredentialService from './credential.service.js';
import CacheService from '../../core/cache/cache.service.js';
import { dbPool } from '../../core/config/db.config.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import PricingService from '../pricing/pricing.service.js';

/**
 * High-Speed Cached Middleware to authenticate public API requests (<0.5ms on Cache Hit)
 */
export const verifyApiClientCredentials = asyncHandler(async (req, res, next) => {
  // Extract credentials from custom headers, query parameters, flat body, or nested methods (IDSpay format)
  const nestedMethodCreds =
    req.body?.methods?.generateToken ||
    req.body?.methods?.fetchDetails ||
    req.body?.generateToken ||
    req.body?.fetchDetails ||
    null;

  const client_ref_num =
    req.body?.client_ref_num ||
    nestedMethodCreds?.client_ref_num ||
    null;

  const api_id =
    req.headers['x-api-id'] ||
    req.headers['x_api_id'] ||
    req.query?.api_id ||
    req.body?.api_id ||
    nestedMethodCreds?.api_id ||
    req.body?.methods?.generateToken?.api_id ||
    req.body?.methods?.fetchDetails?.api_id;

  const api_key =
    req.headers['x-api-key'] ||
    req.headers['x_api_key'] ||
    req.query?.api_key ||
    req.body?.api_key ||
    nestedMethodCreds?.api_key ||
    req.body?.methods?.generateToken?.api_key ||
    req.body?.methods?.fetchDetails?.api_key;

  const token_id =
    req.headers['x-token-id'] ||
    req.headers['x_token_id'] ||
    req.query?.token_id ||
    req.body?.token_id ||
    nestedMethodCreds?.token_id ||
    req.body?.methods?.generateToken?.token_id ||
    req.body?.methods?.fetchDetails?.token_id ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!api_id || !api_key || !token_id) {
    return res.status(401).json({
      http_response_code: 401,
      result_code: 103,
      request_id: `req_${Date.now()}`,
      client_ref_num: client_ref_num,
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

        // 1. Check Admin API Assignment for this user & endpoint
        const endpointPath = req.originalUrl || req.path || req.baseUrl;
        const access = await PricingService.checkApiAccess(endpointPath, req.apiClient.user_id);
        if (!access.isAllowed) {
          return res.status(403).json({
            http_response_code: 403,
            result_code: 103,
            request_id: `req_${Date.now()}`,
            client_ref_num: req.body?.client_ref_num || null,
            message: access.reason || 'Access Denied: This API has not been assigned to your account by the Administrator yet. Please contact admin to enable access.',
            status_message: 'API Not Assigned',
            result: null
          });
        }

        // 2. Check Wallet Balance against effective price
        const effectivePrice = await PricingService.getEffectivePrice(endpointPath, req.apiClient.user_id);
        req.apiClient.effective_price = effectivePrice;

        if (req.apiClient.wallet_balance < effectivePrice) {
          return res.status(402).json({
            http_response_code: 402,
            result_code: 103,
            request_id: `req_${Date.now()}`,
            client_ref_num: req.body?.client_ref_num || null,
            message: `Insufficient wallet balance (₹${effectivePrice.toFixed(2)} required, current balance: ₹${req.apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`,
            status_message: 'Insufficient Balance',
            result: null
          });
        }

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

    // 1. Check Admin API Assignment for this user & endpoint
    const endpointPath = req.originalUrl || req.path || req.baseUrl;
    const access = await PricingService.checkApiAccess(endpointPath, req.apiClient.user_id);
    if (!access.isAllowed) {
      return res.status(403).json({
        http_response_code: 403,
        result_code: 103,
        request_id: `req_${Date.now()}`,
        client_ref_num: req.body?.client_ref_num || null,
        message: access.reason || 'Access Denied: This API has not been assigned to your account by the Administrator yet. Please contact admin to enable access.',
        status_message: 'API Not Assigned',
        result: null
      });
    }

    // 2. Check Wallet Balance against effective price
    const effectivePrice = await PricingService.getEffectivePrice(endpointPath, req.apiClient.user_id);
    req.apiClient.effective_price = effectivePrice;

    if (req.apiClient.wallet_balance < effectivePrice) {
      return res.status(402).json({
        http_response_code: 402,
        result_code: 103,
        request_id: `req_${Date.now()}`,
        client_ref_num: req.body?.client_ref_num || null,
        message: `Insufficient wallet balance (₹${effectivePrice.toFixed(2)} required, current balance: ₹${req.apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`,
        status_message: 'Insufficient Balance',
        result: null
      });
    }

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
