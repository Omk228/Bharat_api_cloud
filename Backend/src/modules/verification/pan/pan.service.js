import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import crypto from 'node:crypto';

export class PanVerificationService {
  /**
   * Validate PAN Format: 5 uppercase letters + 4 digits + 1 uppercase letter
   */
  static isValidPanFormat(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.trim().toUpperCase());
  }

  /**
   * Verify PAN Details with Smart Result Caching & Asynchronous BullMQ Logging
   */
  static async verifyPan({ pan, name, pan_display_name, name_match_method, client_ref_num, apiClient }) {
    const startedAt = Date.now();
    const cleanPan = (pan || '').trim().toUpperCase();
    const cleanName = (name || '').trim();
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `ITV1_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/srv2/validation/pan';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. Check Smart Result Cache first (<2ms) 🔥
    if (cleanPan) {
      const cachedResult = await CacheService.getVerification('pan', cleanPan);
      if (cachedResult) {
        const durationMs = Date.now() - startedAt;
        console.log(`⚡ [PAN CACHE HIT] Returned from Cache in ${durationMs}ms: PAN=${cleanPan}`);

        const cachedResponse = {
          ...cachedResult,
          request_id: cachedResult.request_id || requestId,
          client_ref_num: clientRef,
          _cached: true
        };

        // Asynchronously push to BullMQ queue without blocking (<0.8ms)
        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint: '/srv2/validation/pan',
            method: 'POST',
            requestId: cachedResponse.request_id,
            clientRefNum: clientRef,
            statusCode: cachedResponse.http_response_code || 200,
            resultCode: cachedResponse.result_code || 101,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: hitCost,
            environment: apiClient.environment,
            isSuccess: true
          }).catch(() => {});
        }

        return cachedResponse;
      }
    }

    // 2. Cache Miss: Forward to IDSPay Upstream Provider
    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/validation/pan`;

    let finalResponse;
    let resultCode;
    let isSuccess = false;

    // Check PAN Format
    const isValidFormat = this.isValidPanFormat(cleanPan);

    // If IDSPay live master credentials are configured in .env, forward request to IDSPay Production
    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding PAN request to IDSPay: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, PAN=${cleanPan.substring(0, 5)}XXXX`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            pan: cleanPan,
            name: cleanName,
            pan_display_name: pan_display_name || 'false',
            name_match_method: name_match_method || 'fuzzy'
          })
        });

        console.log(`⏱️ [IDSPAY UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [IDSPAY PRODUCTION RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        finalResponse = {
          ...upstreamData,
          request_id: upstreamData.request_id || requestId,
          client_ref_num: upstreamData.client_ref_num || clientRef
        };
        resultCode = upstreamData.result_code || (upstreamRes.ok ? 101 : 102);
        isSuccess = resultCode === 101 || (upstreamData.status && upstreamData.status.code === 200);
      } catch (err) {
        console.error('⚠️ IDSPay upstream provider call failed:', err.message);
        resultCode = 102;
        isSuccess = false;
        finalResponse = {
          http_response_code: 502,
          result_code: 102,
          request_id: requestId,
          client_ref_num: clientRef,
          message: 'Upstream verification service temporarily unavailable.',
          status_message: 'Verification failed',
          result: null
        };
      }
    } else {
      console.log('ℹ️ No IDSPay master keys found in .env');
      resultCode = 103;
      isSuccess = false;
      finalResponse = {
        http_response_code: 503,
        result_code: 103,
        request_id: requestId,
        client_ref_num: clientRef,
        message: 'Upstream verification provider credentials not configured.',
        status_message: 'Service unavailable',
        result: null
      };
    }

    // 3. Store result in Cache (24 Hours for valid, 5 Mins for invalid)
    if (cleanPan && finalResponse) {
      const ttl = isSuccess ? 86400 : 300;
      CacheService.setVerification('pan', cleanPan, finalResponse, ttl).catch(() => {});
    }

    const durationMs = Date.now() - startedAt;

    // 4. Asynchronously push to BullMQ queue without blocking Express (<0.8ms)
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment,
        isSuccess
      }).catch(() => {});
    }

    return finalResponse;
  }

  /**
   * Verify PAN Details Plus with Demographic, Address, and Allotment data
   * Endpoint: POST /srv2/validation/pan/plus
   */
  static async verifyPanPlus({ pan, client_ref_num, apiClient }) {
    const startedAt = Date.now();
    const cleanPan = (pan || '').trim().toUpperCase();
    const requestId = 'REQ_' + crypto.randomUUID();
    const clientRef = client_ref_num || `BHARAT_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const endpoint = '/srv2/validation/pan/plus';
    const hitCost = (await getEffectiveApiPrice(endpoint, apiClient?.user_id)) || 2.00;

    // Pre-flight wallet balance check
    if (apiClient?.user_id) {
      const currentBalance = parseFloat(apiClient.wallet_balance || 0);
      if (currentBalance < hitCost) {
        throw ApiError.paymentRequired(
          `Insufficient wallet balance. Required: ₹${hitCost.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`
        );
      }
    }

    // 1. Check Redis Cache (TTL: 24h)
    if (cleanPan) {
      const cachedResult = await CacheService.getVerification('pan_plus', cleanPan);
      if (cachedResult) {
        // Purge any stale simulated/hardcoded data previously stored in cache
        if (cachedResult.data?.fullname === 'VERIFIED PAN HOLDER' || cachedResult._simulated) {
          console.log(`🧹 [PAN PLUS CACHE EVICT] Stale simulation data found for ${cleanPan}, purging cache...`);
          await CacheService.deleteVerification('pan_plus', cleanPan);
        } else {
          const durationMs = Date.now() - startedAt;
          console.log(`⚡ [PAN PLUS CACHE HIT] Returned from Cache in ${durationMs}ms: PAN=${cleanPan}`);

          const cachedResponse = {
            ...cachedResult,
            request_id: cachedResult.request_id || requestId,
            client_ref_num: clientRef,
            _cached: true,
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
              cost: 0.00,
              environment: apiClient.environment || 'production',
              isSuccess: true,
            }).catch(err => {
              console.error('Queue dispatch note:', err.message);
            });
          }

          return cachedResponse;
        }
      }
    }

    // 2. Cache Miss: Forward to IDSPay Upstream Provider
    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/validation/pan/plus`;

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;

    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding PAN Plus request to Upstream: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, PAN=${cleanPan.substring(0, 5)}XXXX`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            pan: cleanPan,
          }),
        });

        console.log(`⏱️ [PAN PLUS UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [PAN PLUS UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        finalResponse = {
          status: upstreamData.status || {
            code: upstreamRes.ok ? 200 : upstreamRes.status,
            type: upstreamRes.ok ? 'success' : 'failed',
            message: upstreamData.message || (upstreamRes.ok ? 'Pan details validation successful.' : 'Verification failed'),
          },
          message: upstreamData.message || (upstreamRes.ok ? 'Pan details validation successful.' : 'Verification failed'),
          data: upstreamData.data !== undefined ? upstreamData.data : (upstreamData.result || null),
          request_id: upstreamData.request_id || requestId,
          client_ref_num: upstreamData.client_ref_num || clientRef,
        };

        isSuccess = upstreamRes.ok && (
          upstreamData.status?.code === 200 ||
          upstreamData.status?.type === 'success' ||
          upstreamData.message === 'Pan details validation successful.' ||
          Boolean(upstreamData.data?.pan)
        );
        resultCode = isSuccess ? 101 : 102;
      } catch (err) {
        console.error('⚠️ Upstream PAN Plus call failed:', err.message);
        resultCode = 102;
        isSuccess = false;
        finalResponse = {
          status: {
            code: 502,
            type: 'failed',
            message: 'Upstream verification service temporarily unavailable. Please try again.',
          },
          message: 'Upstream verification service temporarily unavailable. Please try again.',
          data: null,
          request_id: requestId,
          client_ref_num: clientRef,
        };
      }
    } else {
      console.log('ℹ️ No IDSPay master keys found in .env');
      resultCode = 103;
      isSuccess = false;
      finalResponse = {
        status: {
          code: 503,
          type: 'failed',
          message: 'Upstream verification provider credentials not configured on server.',
        },
        message: 'Upstream verification provider credentials not configured on server.',
        data: null,
        request_id: requestId,
        client_ref_num: clientRef,
      };
    }

    const durationMs = Date.now() - startedAt;

    // 3. Store result in Cache (24 Hours for valid upstream response ONLY, never cache simulation)
    if (cleanPan && finalResponse && isSuccess && finalResponse.data?.pan && finalResponse.data?.fullname !== 'VERIFIED PAN HOLDER' && !finalResponse._simulated) {
      await CacheService.setVerification('pan_plus', cleanPan, finalResponse, 86400);
      console.log(`💾 [PAN PLUS CACHED] Key verify:pan_plus:${cleanPan} stored for 24h`);
    }

    // 4. Non-Blocking Background Job via BullMQ (Wallet Debit ₹2.00 + Audit Log)
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0.00,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch(err => {
        console.error('Queue dispatch note:', err.message);
      });
    }

    return finalResponse;
  }
}

export default PanVerificationService;
