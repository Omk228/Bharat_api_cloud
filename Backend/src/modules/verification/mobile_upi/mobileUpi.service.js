import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';

export class MobileUpiVerificationService {
  /**
   * Validate 10-digit Indian Mobile Number
   */
  static isValidMobileNumber(mobile) {
    if (!mobile || typeof mobile !== 'string') return false;
    const clean = mobile.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * Mobile To UPI Lookup (/srv2/mobile-upi-lookup/enhanced)
   */
  static async lookupMobileUpi({
    mobile_number,
    client_ref_num,
    apiClient,
  }) {
    const startTime = Date.now();
    const cleanMobile = String(mobile_number || '').trim().replace(/\D/g, '');
    const cacheKeyIdentifier = cleanMobile;
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `UPI_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/srv2/mobile-upi-lookup/enhanced';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. Check Smart Result Cache first (<2ms)
    if (cleanMobile) {
      const cachedResult = await CacheService.getVerification('mobile_upi', cacheKeyIdentifier);
      if (cachedResult && cachedResult.result_code === 101 && cachedResult.result?.vpa) {
        const durationMs = Date.now() - startTime;
        console.log(`⚡ [MOBILE UPI CACHE HIT] Returned from Cache in ${durationMs}ms: Mobile=${cleanMobile.slice(0, 3)}XXXX${cleanMobile.slice(-3)}`);

        const cachedResponse = {
          http_response_code: 200,
          client_ref_num: clientRef,
          request_id: requestId,
          result_code: 101,
          result: {
            mobile_linked_name: cachedResult.result.mobile_linked_name,
            vpa: cachedResult.result.vpa,
          },
        };

        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint,
            method: 'POST',
            requestId: cachedResponse.request_id,
            clientRefNum: clientRef,
            statusCode: 200,
            resultCode: 101,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: hitCost,
            environment: apiClient.environment || 'production',
            isSuccess: true,
          }).catch((err) => {
            console.error('Queue dispatch error on cache hit:', err.message);
          });
        }

        return cachedResponse;
      }
    }

    // 2. Cache Miss: Forward to IDSPay Upstream Provider
    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/mobile-upi-lookup/enhanced`;

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;

    const isValidMobile = this.isValidMobileNumber(cleanMobile);

    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding Mobile To UPI request to Upstream: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, Mobile=${cleanMobile.substring(0, 3)}XXXX`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            mobile_number: cleanMobile,
            mobile: cleanMobile,
          }),
        });

        console.log(`⏱️ [MOBILE UPI UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [MOBILE UPI UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        const rawData = upstreamData.data || upstreamData.result || {};
        const innerResultCode = rawData.result_code !== undefined ? Number(rawData.result_code) : undefined;
        const outerResultCode = upstreamData.result_code !== undefined ? Number(upstreamData.result_code) : undefined;

        const vpa = rawData.vpa || upstreamData.vpa || null;
        const mobileLinkedName = rawData.mobile_linked_name || rawData.name || upstreamData.mobile_linked_name || null;
        const hasVpaOrName = Boolean(vpa || mobileLinkedName);

        if (hasVpaOrName && innerResultCode !== 103 && outerResultCode !== 103) {
          resultCode = 101;
          isSuccess = true;
          finalResponse = {
            http_response_code: 200,
            client_ref_num: clientRef,
            request_id: requestId,
            result_code: 101,
            result: {
              mobile_linked_name: mobileLinkedName,
              vpa: vpa,
            },
          };
        } else {
          resultCode = innerResultCode || outerResultCode || 103;
          isSuccess = false;
          finalResponse = {
            http_response_code: 200,
            client_ref_num: clientRef,
            request_id: requestId,
            result_code: resultCode,
            message: rawData.message || upstreamData.message || 'No linked name found',
            result: null,
          };
        }
      } catch (err) {
        console.error('⚠️ Mobile To UPI upstream provider call failed:', err.message);
        resultCode = 102;
        isSuccess = false;
        finalResponse = {
          http_response_code: 502,
          client_ref_num: clientRef,
          request_id: requestId,
          result_code: 102,
          message: 'Upstream verification service temporarily unavailable. Please try again.',
          result: null,
        };
      }
    } else {
      console.log('ℹ️ No IDSPay master keys found in .env, using gateway simulated sandbox.');
    }

    let isSimulated = false;
    // Fallback sandbox simulation if upstream was not called (e.g. Missing master keys in local dev)
    if (!finalResponse) {
      isSimulated = true;
      if (!isValidMobile || cleanMobile.startsWith('0000')) {
        resultCode = 103;
        isSuccess = false;
        finalResponse = {
          http_response_code: 200,
          client_ref_num: clientRef,
          request_id: requestId,
          result_code: 103,
          message: 'No linked name found',
          result: null,
        };
      } else {
        resultCode = 101;
        isSuccess = true;
        finalResponse = {
          http_response_code: 200,
          client_ref_num: clientRef,
          request_id: requestId,
          result_code: 101,
          result: {
            mobile_linked_name: 'ROHIT SHARMA',
            vpa: `${cleanMobile}@paytm`,
          },
        };
      }
    }

    const durationMs = Date.now() - startTime;

    // 3. Store result in Cache (24 Hours for valid lookups, never cache simulation)
    if (cleanMobile && finalResponse && isSuccess && !isSimulated) {
      await CacheService.setVerification('mobile_upi', cacheKeyIdentifier, finalResponse, 86400);
      console.log(`💾 [MOBILE UPI CACHED] Key verify:mobile_upi:${cacheKeyIdentifier} stored for 24h`);
    }

    // 4. Non-Blocking Background Job via BullMQ (Wallet Debit ₹2.00 + Audit Log)
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId: finalResponse.request_id || requestId,
        clientRefNum: clientRef,
        statusCode: finalResponse.http_response_code || 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0.00,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch note:', err.message);
      });
    }

    return finalResponse;
  }
}

export default MobileUpiVerificationService;
