import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

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
    const idspayCreds = await credentialResolver.getIdspayCredentials();
    const masterApiId = idspayCreds.apiId;
    const masterApiKey = idspayCreds.apiKey;
    const masterTokenId = idspayCreds.tokenId;
    const upstreamUrl = `${idspayCreds.baseUrl}/srv3/mobile-to-bank/advance`;

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

        if (isUpstreamLowBalance(upstreamData)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during Mobile To Bank Advance verification.');
          finalResponse = formatUpstreamLowBalanceResponse(requestId, clientRef);
          resultCode = 102;
          isSuccess = false;
        } else {
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
        }
      } catch (err) {
        console.error('⚠️ Mobile To Bank Advance call failed:', err.message);
        resultCode = 102;
        isSuccess = false;
        finalResponse = isUpstreamLowBalance(err.message)
          ? formatUpstreamLowBalanceResponse(requestId, clientRef)
          : {
              status: {
                code: 500,
                type: 'failed',
                message: 'Server Error',
              },
              http_response_code: 500,
              client_ref_num: clientRef,
              request_id: requestId,
              result_code: 102,
              message: 'Server Error. Please try again later.',
              status_message: 'Server Error',
              result: null,
              data: null,
            };
      }
    } else {
      console.log('ℹ️ No master keys found in DB or .env');
      resultCode = 103;
      isSuccess = false;
      finalResponse = {
        status: {
          code: 500,
          type: 'failed',
          message: 'Server Error',
        },
        http_response_code: 500,
        result_code: 103,
        request_id: requestId,
        client_ref_num: clientRef,
        message: 'Server Error. Service configuration missing.',
        status_message: 'Server Error',
        result: null,
        data: null,
      };
    }

    const durationMs = Date.now() - startTime;

    // 3. Store in cache if successful (24 Hours)
    if (cleanMobile && finalResponse && isSuccess && finalResponse.bank_account_data) {
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
