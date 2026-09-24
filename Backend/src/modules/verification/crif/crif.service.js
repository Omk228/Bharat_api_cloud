import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import QueueService from '../../../core/queue/queue.service.js';

// In-memory fallback map for high-speed CRIF report retrieval
const localReportStore = new Map();

export class CrifVerificationService {
  /**
   * Validate Indian Mobile Number (10 digits)
   */
  static isValidMobileNumber(phone) {
    const clean = String(phone || '').replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * Store report in cache and in-memory store (24 hours TTL)
   */
  static async saveReport(token, reportData) {
    localReportStore.set(token, { data: reportData, expiresAt: Date.now() + 86400000 });
    localReportStore.set(token.toLowerCase(), { data: reportData, expiresAt: Date.now() + 86400000 });
    localReportStore.set(token.toUpperCase(), { data: reportData, expiresAt: Date.now() + 86400000 });

    try {
      await CacheService.setVerification('crif_rep', token, reportData, 86400);
    } catch (e) {
      // Ignore cache store error
    }
  }

  /**
   * Retrieve report by token
   */
  static async getReport(token) {
    const cleanToken = String(token || '').replace(/\.pdf$/i, '').trim();
    const mem = localReportStore.get(cleanToken) ||
      localReportStore.get(cleanToken.toLowerCase()) ||
      localReportStore.get(cleanToken.toUpperCase());

    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }

    try {
      const cached = await CacheService.getVerification('crif_rep', cleanToken);
      if (cached) return cached;
    } catch (e) {
      // Ignore cache fetch error
    }

    return mem?.data || null;
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
        const rawText = await upstreamRes.text();
        let data = null;
        try {
          data = JSON.parse(rawText);
          console.log(`📥 [CRIF UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(data, null, 2));
        } catch (parseErr) {
          console.error(`⚠️ [CRIF UPSTREAM NON-JSON] Status ${upstreamRes.status}:`, rawText);
        }

        if (data && isUpstreamLowBalance(data)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during CRIF verification.');
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }

        const isUpstreamOk = Boolean(
          data && (
            data.status?.code === 200 ||
            data.status === 200 ||
            data.status === true ||
            data.status === 'success' ||
            data.statusCode === 200 ||
            data.http_response_code === 200 ||
            data.result_code === 101 ||
            data.result_code === 200 ||
            data.success === true ||
            data.data?.status === 'success' ||
            data.data?.score ||
            data.data?.credit_report ||
            data.data?.result_json ||
            data.result_json ||
            data.credit_report ||
            (data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0 && !data.error)
          )
        );

        if (isUpstreamOk) {
          upstreamResult = data;
          isSuccess = true;
        } else if (data) {
          upstreamResult = data;
          isSuccess = false;
        }
      } catch (err) {
        console.error('⚠️ CRIF upstream provider error:', err.message);
        if (isUpstreamLowBalance(err.message)) {
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }
      }
    }

    // 2. Generate secure report token & PDF URL
    const reportToken = `crif_${crypto.randomBytes(10).toString('hex')}`;
    const reportUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/reports/crif/${reportToken}.pdf`;

    let finalResponse;

    if (upstreamResult && isSuccess) {
      const outData = upstreamResult.data || upstreamResult;
      
      // Save report data for PDF rendering
      await CrifVerificationService.saveReport(reportToken, {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        mobile_no: cleanMobile,
        client_ref_num: clientRef,
        ...outData,
      });

      let updatedData = typeof outData === 'object' ? { ...outData } : { result: outData };
      if (updatedData.result_json && typeof updatedData.result_json === 'object') {
        updatedData.result_json = {
          ...updatedData.result_json,
          report_url: reportUrl,
          web_token_url: reportUrl,
          pdf_url: reportUrl,
        };
      }

      finalResponse = {
        status: {
          code: 200,
          type: 'success',
          message: 'CRIF High Mark credit report fetched successfully.',
        },
        message: 'CRIF High Mark credit report fetched successfully.',
        web_token_url: reportUrl,
        report_url: reportUrl,
        pdf_url: reportUrl,
        data: {
          status: 'success',
          web_token_url: reportUrl,
          report_url: reportUrl,
          pdf_url: reportUrl,
          ...updatedData,
        },
      };
    } else if (upstreamResult && !isSuccess) {
      finalResponse = upstreamResult;
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

    // 3. Asynchronously dispatch audit job and wallet debit (only debit on true success)
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: isSuccess ? 200 : (finalResponse?.status?.code || finalResponse?.http_response_code || 500),
        resultCode: isSuccess ? 'SUCCESS' : 'FAILED',
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error in CRIF service:', err.message);
      });
    }

    return finalResponse;
  }
}

export default CrifVerificationService;
