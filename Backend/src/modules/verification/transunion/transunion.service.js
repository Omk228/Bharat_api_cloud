import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

// In-memory fallback map for high-speed PDF report retrieval
const localReportStore = new Map();

export class TransunionVerificationService {
  /**
   * Validate 10-digit Indian Mobile Number
   */
  static isValidMobileNumber(mobile) {
    if (!mobile || typeof mobile !== 'string') return false;
    const clean = mobile.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * Validate 10-character PAN
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim());
  }

  /**
   * Store report in cache and in-memory fallback
   */
  static async saveReport(token, reportData) {
    localReportStore.set(token, { data: reportData, expiresAt: Date.now() + 86400000 });
    // Also save to Redis cache if enabled
    try {
      await CacheService.setVerification('cibil_rep', token, reportData, 86400);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Retrieve report by token
   */
  static async getReport(token) {
    const mem = localReportStore.get(token);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }
    try {
      const cached = await CacheService.getVerification('cibil_rep', token);
      if (cached) return cached;
    } catch (e) {
      // ignore
    }
    return mem?.data || null;
  }

  /**
   * TransUnion Score Hybrid Verification (/srv5/transunion-Score-Hybrid)
   */
  static async verifyTransunionScoreHybrid({
    forename,
    surname,
    phone_number,
    gender,
    pan_id,
    date_of_birth,
    client_ref_num,
    apiClient,
    baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com',
  }) {
    const startTime = Date.now();
    const cleanForename = String(forename || '').trim();
    const cleanSurname = String(surname || '').trim();
    const cleanPhone = String(phone_number || '').trim().replace(/\D/g, '');
    const cleanGender = String(gender || 'Male').trim();
    const cleanPan = String(pan_id || '').trim().toUpperCase();
    const cleanDob = String(date_of_birth || '').trim();

    if (!cleanForename || !cleanSurname) {
      throw ApiError.badRequest('forename and surname are required fields');
    }
    if (!cleanPhone || !this.isValidMobileNumber(cleanPhone)) {
      throw ApiError.badRequest('Valid 10-digit phone_number is required');
    }
    if (!cleanPan || !this.isValidPan(cleanPan)) {
      throw ApiError.badRequest('Valid 10-character pan_id is required');
    }

    const endpoint = '/srv5/transunion-Score-Hybrid';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);
    const clientRef = client_ref_num || `TU_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const requestId = crypto.randomUUID();

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    const idspayCreds = await credentialResolver.getIdspayCredentials();
    const masterApiId = idspayCreds.apiId;
    const masterApiKey = idspayCreds.apiKey;
    const masterTokenId = idspayCreds.tokenId;
    const upstreamUrl = `${idspayCreds.baseUrl}/srv5/transunion-Score-Hybrid`;

    let upstreamResult = null;
    let isSuccess = false;

    // 1. Forward request to upstream provider if master credentials are configured
    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding TransUnion Hybrid request to: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, PAN=${cleanPan.slice(0, 5)}XXXX${cleanPan.slice(-1)}, Mobile=${cleanPhone.slice(0, 3)}XXXX${cleanPhone.slice(-3)}`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            forename: cleanForename,
            surname: cleanSurname,
            phone_number: cleanPhone,
            gender: cleanGender,
            pan_id: cleanPan,
            date_of_birth: cleanDob || undefined,
          }),
        });

        console.log(`⏱️ [TRANSUNION UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);
        const data = await upstreamRes.json();
        console.log(`📥 [TRANSUNION UPSTREAM RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(data, null, 2));

        if (isUpstreamLowBalance(data)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during TransUnion verification.');
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }

        if (data && (data.status?.code === 200 || data.http_response_code === 200 || data.data?.status === 'success')) {
          upstreamResult = data;
          isSuccess = true;
        }
      } catch (err) {
        console.error('⚠️ TransUnion upstream provider error:', err.message);
        if (isUpstreamLowBalance(err.message)) {
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }
      }
    }

    // 2. Generate secure report token & white-labeled PDF URL
    const reportToken = `tu_${crypto.randomBytes(10).toString('hex')}`;
    const reportUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/reports/cibil/${reportToken}.pdf`;

    let finalResponse;

    if (upstreamResult && isSuccess) {
      // White-label upstream response by replacing direct provider URLs
      const outData = upstreamResult.data || upstreamResult;
      
      // Save report data for PDF generation
      await this.saveReport(reportToken, {
        forename: cleanForename,
        surname: cleanSurname,
        phone_number: cleanPhone,
        pan_id: cleanPan,
        gender: cleanGender,
        date_of_birth: cleanDob,
        ...outData,
      });

      finalResponse = {
        status: {
          code: 200,
          type: 'success',
          message: 'CIBIL report ready! Click the link to view your score.',
        },
        message: 'CIBIL report ready! Click the link to view your score.',
        data: {
          status: 'success',
          web_token_url: reportUrl,
          client_key: outData.client_key || `tu_${crypto.randomBytes(8).toString('hex')}`,
          steps_summary: outData.steps_summary || [
            { step: 1, name: 'FulfillOffer', status: 'success' },
            { step: 2, name: 'GetAuthenticationQuestions', status: 'success' },
            { step: 3, name: 'GetCustomerAssets', status: 'success' },
            { step: 4, name: 'GetProductWebToken', status: 'success' },
          ],
          steps: outData.steps || [],
          report_url: reportUrl,
          message: 'CIBIL report ready! Click the link to view your score.',
          credit_report_message: {
            message: 'CIBIL report ready! Click the link to view your score.',
            message_code: 'Message code not found',
          },
        },
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

    // 4. Audit logging & non-blocking background queue job
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode: 101,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess: true,
      }).catch((err) => {
        console.error('Queue dispatch note:', err.message);
      });
    }

    return finalResponse;
  }
}

export default TransunionVerificationService;
