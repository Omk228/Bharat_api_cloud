import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class WorkEmailVerificationService {
  /**
   * Validate Email Syntax
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(clean);
  }

  /**
   * Verify Work / Corporate Email Address
   */
  static async verifyWorkEmail({
    email,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/work-email',
  }) {
    const startTime = Date.now();
    const rawEmail = String(email || '').trim();
    const cleanEmail = rawEmail.toLowerCase();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `WKV_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawEmail) {
      throw ApiError.badRequest('Missing required parameter: email (or work_email) is mandatory.');
    }

    if (!this.isValidEmail(cleanEmail)) {
      throw ApiError.badRequest(`Invalid email format: "${rawEmail}". Please provide a valid email address.`);
    }

    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 1. Check Smart Result Cache first (<1ms)
    const cachedResult = await CacheService.getVerification('work_email', cleanEmail);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [WORK EMAIL CACHE HIT] Returned from Cache in ${durationMs}ms: email=${cleanEmail}`);

      const cachedResponse = {
        ...cachedResult,
        http_response_code: 200,
        result_code: 101,
        request_id: requestId,
        client_ref_num: clientRef,
      };

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
          console.error('Queue dispatch error on cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Resolve Upstream Credentials
    const creds = await credentialResolver.getWorkEmailCredentials();
    const upstreamUrl = creds.baseUrl || 'https://corp-email-verifier.onrender.com/api/verify';
    const clientId = creds.clientId || 'bharat_api_cloud';
    const apiKey = creds.apiKey || 'bac_live_7f8e3a2b1c0d4e5f';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [WORK EMAIL PROXY] Calling Upstream Gateway: ${upstreamUrl} for ${cleanEmail}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          api_key: apiKey,
          email: cleanEmail,
        }),
        timeout: 15000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [WORK EMAIL PARSE WARNING] Upstream returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      if (responseJson && (responseJson.success || responseJson.data)) {
        upstreamData = responseJson.data || responseJson;
        isSuccess = true;
      } else if (responseJson) {
        upstreamData = responseJson.data || responseJson;
        isSuccess = Boolean(responseJson.success);
      } else {
        throw new Error(`Upstream returned unexpected status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [WORK EMAIL UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      // If upstream is unavailable, return structured error response
      statusCode = 502;
      resultCode = 102;
      const durationMs = Date.now() - startTime;

      const errorResponse = {
        status: 'error',
        status_message: 'failed',
        http_response_code: 502,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: 'Upstream verification service temporarily unavailable. Please retry in a few moments.',
        error: upstreamErr.message,
        data: null,
        result: null,
      };

      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'POST',
          requestId,
          clientRefNum: clientRef,
          statusCode: 502,
          resultCode: 102,
          durationMs,
          clientIp: apiClient.client_ip,
          cost: 0,
          environment: apiClient.environment || 'production',
          isSuccess: false,
        }).catch(() => {});
      }

      return errorResponse;
    }

    const durationMs = Date.now() - startTime;

    // 3. Format Normalized Response
    const emailStatus = upstreamData?.status || 'VALID';
    const isDeliverable = upstreamData?.isDeliverable ?? upstreamData?.is_deliverable ?? false;
    const isCorporate = upstreamData?.isCorporate ?? upstreamData?.is_corporate ?? false;
    const reason = upstreamData?.reason || (isCorporate ? 'Corporate email verified.' : 'Non-corporate email detected.');

    const formattedData = {
      email: upstreamData?.email || cleanEmail,
      status: emailStatus,
      reason: reason,
      score: upstreamData?.score ?? (emailStatus === 'VALID' ? 100 : 0),
      is_deliverable: isDeliverable,
      is_corporate: isCorporate,
      is_catch_all: upstreamData?.isCatchAll ?? upstreamData?.is_catch_all ?? false,
      is_role_account: upstreamData?.isRoleAccount ?? upstreamData?.is_role_account ?? false,
      is_disposable: upstreamData?.isDisposable ?? upstreamData?.is_disposable ?? false,
      mail_provider: upstreamData?.mailProvider || upstreamData?.mail_provider || 'Custom Mail Server',
      did_you_mean: upstreamData?.didYouMean || upstreamData?.did_you_mean || null,
      details: upstreamData?.details || {},
      duration_ms: upstreamData?.durationMs || durationMs,
      verified_at: upstreamData?.verifiedAt || new Date().toISOString(),
    };

    const finalResponse = {
      status: 'success',
      status_message: 'completed',
      http_response_code: 200,
      result_code: 101,
      request_id: requestId,
      client_ref_num: clientRef,
      message: 'Work email verified successfully',
      data: formattedData,
      result: formattedData,
    };

    // Cache result for 24 hours
    CacheService.setVerification('work_email', cleanEmail, finalResponse, 86400).catch(() => {});

    // Asynchronously log and deduct wallet balance
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
        console.error('Queue dispatch error on work email verification:', err.message);
      });
    }

    return finalResponse;
  }
}

export default WorkEmailVerificationService;
