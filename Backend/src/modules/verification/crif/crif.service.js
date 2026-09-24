import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import QueueService from '../../../core/queue/queue.service.js';

export class CrifVerificationService {
  /**
   * Validate Indian Mobile Number (10 digits)
   */
  static isValidMobileNumber(phone) {
    const clean = String(phone || '').replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * CRIF High Mark Credit Score V4 Verification (/crif/Credit-ScoreV4)
   */
  static async verifyCrifScoreV4({
    mobile_no,
    first_name,
    last_name,
    name_lookup = 0,
    apiClient,
    baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com',
  }) {
    const startTime = Date.now();
    const cleanMobile = String(mobile_no || '').trim().replace(/\D/g, '');
    const cleanFirstName = String(first_name || '').trim();
    const cleanLastName = String(last_name || '').trim();
    const lookupVal = Number(name_lookup) === 1 ? 1 : 0;

    if (!cleanMobile || !this.isValidMobileNumber(cleanMobile)) {
      throw ApiError.badRequest('Valid 10-digit mobile_no is required (e.g. 9876543210)');
    }
    if (!cleanFirstName) {
      throw ApiError.badRequest('first_name is required');
    }
    if (!cleanLastName) {
      throw ApiError.badRequest('last_name is required');
    }

    const endpoint = '/crif/Credit-ScoreV4';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);
    const clientRef = `CRIF_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const requestId = crypto.randomUUID();

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`
      );
    }

    const idspayCreds = await credentialResolver.getIdspayCredentials();
    const masterApiId = idspayCreds.apiId;
    const masterApiKey = idspayCreds.apiKey;
    const masterTokenId = idspayCreds.tokenId;
    const upstreamUrl = `${idspayCreds.baseUrl}/crif/Credit-ScoreV4`;

    let upstreamResult = null;
    let isSuccess = false;

    // 1. Forward request to upstream provider if master credentials are configured
    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding CRIF High Mark request to: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, Name=${cleanFirstName} ${cleanLastName}, Mobile=${cleanMobile.slice(0, 3)}XXXX${cleanMobile.slice(-3)}`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            mobile_no: cleanMobile,
            name_lookup: lookupVal,
            first_name: cleanFirstName,
            last_name: cleanLastName,
          }),
        });

        console.log(`⏱️ [CRIF UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);
        const data = await upstreamRes.json();
        console.log(`📥 [CRIF UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(data, null, 2));

        if (isUpstreamLowBalance(data)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during CRIF verification.');
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }

        if (data && (data.status?.code === 200 || data.http_response_code === 200 || data.data?.status === 'success' || data.data?.score)) {
          upstreamResult = data;
          isSuccess = true;
        }
      } catch (err) {
        console.error('⚠️ CRIF upstream provider error:', err.message);
        if (isUpstreamLowBalance(err.message)) {
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }
      }
    }

    let finalResponse;

    if (upstreamResult && isSuccess) {
      const outData = upstreamResult.data || upstreamResult;
      finalResponse = {
        status: {
          code: 200,
          type: 'success',
          message: 'CRIF High Mark credit report fetched successfully.',
        },
        message: 'CRIF High Mark credit report fetched successfully.',
        data: outData,
      };
    } else {
      isSuccess = false;
      finalResponse = {
        status: {
          code: 500,
          type: 'failed',
          message: 'Server Error',
        },
        http_response_code: 500,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: 'Server Error. Please try again later.',
        status_message: 'Server Error',
        data: null,
      };
    }

    const durationMs = Date.now() - startTime;

    // 3. Asynchronously dispatch audit job and wallet debit
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode: 'SUCCESS',
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess: true,
      }).catch((err) => {
        console.error('Queue dispatch error in CRIF service:', err.message);
      });
    }

    return finalResponse;
  }
}

export default CrifVerificationService;
