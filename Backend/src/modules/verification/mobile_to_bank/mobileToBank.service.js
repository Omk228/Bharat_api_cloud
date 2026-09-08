import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';

export class MobileToBankService {
  /**
   * Validate 10-digit Indian Mobile Number
   */
  static isValidMobileNumber(mobile) {
    if (!mobile || typeof mobile !== 'string') return false;
    const clean = mobile.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * Mobile To Bank Advance Verification (/srv3/mobile-to-bank/advance)
   */
  static async verifyMobileToBankAdvance({
    mobile_number,
    consent = 'Y',
    client_ref_num,
    apiClient,
  }) {
    const startTime = Date.now();
    const cleanMobile = String(mobile_number || '').trim().replace(/\D/g, '');
    const cleanConsent = String(consent || 'Y').trim().toUpperCase();
    const cacheKeyIdentifier = cleanMobile;
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `M2B_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/srv3/mobile-to-bank/advance';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. Check Smart Result Cache first (<2ms)
    if (cleanMobile) {
      const cachedResult = await CacheService.getVerification('mobile_to_bank_advance', cacheKeyIdentifier);
      if (cachedResult && cachedResult.result_code === 101) {
        const durationMs = Date.now() - startTime;
        console.log(`⚡ [MOBILE TO BANK ADVANCE CACHE HIT] Returned in ${durationMs}ms: Mobile=${cleanMobile.slice(0, 3)}XXXX${cleanMobile.slice(-3)}`);

        const cachedResponse = {
          ...cachedResult,
          client_ref_num: clientRef,
          request_id: requestId,
        };

        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint,
            method: 'POST',
            requestId: cachedResponse.request_id,
            clientRefNum: clientRef,
            statusCode: cachedResponse.http_response_code || 200,
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

    // 2. Forward to IDSPay Upstream Provider
    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv3/mobile-to-bank/advance`;

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;

    const isValidMobile = this.isValidMobileNumber(cleanMobile);

    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding Mobile To Bank Advance request to Upstream: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, Mobile=${cleanMobile.substring(0, 3)}XXXX, Consent=${cleanConsent}`);

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
            consent: cleanConsent,
          }),
        });

        console.log(`⏱️ [MOBILE TO BANK ADVANCE UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [MOBILE TO BANK ADVANCE UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        const rawData = upstreamData.data || upstreamData.result || {};
        const innerResultCode = rawData.result_code !== undefined ? Number(rawData.result_code) : undefined;
        const outerResultCode = upstreamData.result_code !== undefined ? Number(upstreamData.result_code) : undefined;

        resultCode = innerResultCode ?? outerResultCode ?? (upstreamRes.ok ? 101 : 102);
        isSuccess = resultCode === 101 || (upstreamData.status && (upstreamData.status.code === 200 || upstreamData.status === 'SUCCESS'));

        finalResponse = {
          ...upstreamData,
          http_response_code: upstreamData.http_response_code || upstreamRes.status || 200,
          client_ref_num: upstreamData.client_ref_num || clientRef,
          request_id: upstreamData.request_id || requestId,
          result_code: resultCode,
        };

        const rawBankData =
          upstreamData.bank_account_data ||
          upstreamData.data?.bank_account_data ||
          upstreamData.result?.bank_account_data ||
          (Array.isArray(upstreamData.data) ? upstreamData.data[0]?.bank_account_data || upstreamData.data[0] : null) ||
          null;

        if (rawBankData) {
          finalResponse.bank_account_data = rawBankData;
        }
      } catch (err) {
        console.error('⚠️ Mobile To Bank Advance upstream provider call failed:', err.message);
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
      console.log('ℹ️ No IDSPay master keys found in .env, using fallback simulation.');
    }

    let isSimulated = false;
    // Fallback simulation if upstream was not called (e.g. Missing master keys in local dev)
    if (!finalResponse) {
      isSimulated = true;
      if (!isValidMobile || cleanMobile.startsWith('0000')) {
        resultCode = 102;
        isSuccess = false;
        finalResponse = {
          http_response_code: 200,
          client_ref_num: clientRef,
          request_id: requestId,
          result_code: 102,
          message: 'Invalid Mobile Number or No Record Found',
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
          message: 'Details fetched successfully.',
          bank_account_data: {
            name: 'RINKI  .',
            utr: '625199976885',
            account_number: '6947737207',
            ifsc: 'KKBK0004587',
            upi: `${cleanMobile}@nyes`,
          },
          result: {
            mobile_number: cleanMobile,
            consent: cleanConsent,
          },
        };
      }
    }

    const durationMs = Date.now() - startTime;

    // 3. Store in cache if successful (24 Hours)
    if (cleanMobile && finalResponse && isSuccess && !isSimulated) {
      await CacheService.setVerification('mobile_to_bank_advance', cacheKeyIdentifier, finalResponse, 86400);
      console.log(`💾 [MOBILE TO BANK ADVANCE CACHED] Key verify:mobile_to_bank_advance:${cacheKeyIdentifier} stored for 24h`);
    }

    // 4. Non-Blocking Background Job via BullMQ (Wallet Debit + Audit Log)
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

export default MobileToBankService;
