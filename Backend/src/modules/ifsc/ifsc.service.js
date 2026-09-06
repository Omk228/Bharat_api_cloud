import crypto from 'node:crypto';
import { ENV } from '../../core/config/env.config.js';
import { upstreamFetch } from '../../core/utils/httpAgent.js';
import CacheService from '../../core/cache/cache.service.js';
import QueueService from '../../core/queue/queue.service.js';
import { getApiPrice } from '../../core/config/pricing.config.js';
import { ApiError } from '../../core/utils/apiError.js';

export class IfscService {
  /**
   * Clean and normalize IFSC string
   */
  static cleanIfsc(input) {
    if (!input || typeof input !== 'string') return '';
    return input.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Validate Indian Bank IFSC Code format:
   * 4 alphabetic characters + 0 + 6 alphanumeric characters (total 11 chars)
   */
  static isValidIfsc(ifsc) {
    if (!ifsc || typeof ifsc !== 'string') return false;
    const clean = this.cleanIfsc(ifsc);
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
  }

  /**
   * Fetch IFSC details from Razorpay IFSC service with smart caching & queue audit
   */
  static async getIfscDetails({ ifsc, client_ref_num, apiClient }) {
    const startedAt = Date.now();
    const clean = this.cleanIfsc(ifsc);
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `IFSC_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/ifsc';
    const hitCost = getApiPrice(endpoint);

    // Fast-fail if IFSC code is missing or format is completely invalid
    if (!clean || !this.isValidIfsc(clean)) {
      return {
        isFound: false,
        statusCode: 404,
        error: 'Not Found',
      };
    }

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. High-speed Dual-layer Cache (<1ms retrieval)
    const cachedData = await CacheService.getVerification('ifsc', clean);
    if (cachedData) {
      const durationMs = Date.now() - startedAt;
      console.log(`⚡ [IFSC CACHE HIT] Returned from Cache in ${durationMs}ms: IFSC=${clean}`);

      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'GET',
          requestId,
          clientRefNum: clientRef,
          statusCode: 200,
          resultCode: 101,
          durationMs,
          clientIp: apiClient.client_ip,
          cost: hitCost,
          environment: apiClient.environment || 'production',
          isSuccess: true,
        }).catch(() => {});
      }

      return {
        isFound: true,
        statusCode: 200,
        data: cachedData,
      };
    }

    // 2. Fetch from Upstream Razorpay IFSC API Root
    const baseUrl = ENV.RAZORPAY_IFSC?.BASE_URL || 'https://ifsc.razorpay.com';
    const targetUrl = `${baseUrl}/${encodeURIComponent(clean)}`;

    try {
      console.log(`📡 [IFSC GATEWAY] Forwarding request to Razorpay IFSC API: ${targetUrl}`);
      const upstreamRes = await upstreamFetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Bharat-API-Cloud/1.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      const durationMs = Date.now() - startedAt;

      if (upstreamRes.status === 200) {
        const data = await upstreamRes.json();

        // Cache valid IFSC data for 7 days (604,800 seconds)
        await CacheService.setVerification('ifsc', clean, data, 604800).catch(() => {});

        // Asynchronously log audit job & deduct fee
        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint,
            method: 'GET',
            requestId,
            clientRefNum: clientRef,
            statusCode: 200,
            resultCode: 101,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: hitCost,
            environment: apiClient.environment || 'production',
            isSuccess: true,
          }).catch(() => {});
        }

        return {
          isFound: true,
          statusCode: 200,
          data,
        };
      }

      if (upstreamRes.status === 404) {
        console.warn(`⚠️ [IFSC NOT FOUND] Upstream 404 for IFSC: ${clean}`);

        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint,
            method: 'GET',
            requestId,
            clientRefNum: clientRef,
            statusCode: 404,
            resultCode: 102,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: 0,
            environment: apiClient.environment || 'production',
            isSuccess: false,
          }).catch(() => {});
        }

        return {
          isFound: false,
          statusCode: 404,
          error: 'Not Found',
        };
      }

      // Other non-200 / non-404 status from upstream
      const errorText = await upstreamRes.text();
      console.error(`❌ [IFSC GATEWAY ERROR] Upstream status ${upstreamRes.status}: ${errorText}`);
      throw new Error(`Upstream Razorpay IFSC service returned status ${upstreamRes.status}`);
    } catch (err) {
      if (err.name === 'TimeoutError') {
        throw ApiError.gatewayTimeout('Upstream Razorpay IFSC API timed out. Please retry.');
      }
      throw err;
    }
  }
}

export default IfscService;
