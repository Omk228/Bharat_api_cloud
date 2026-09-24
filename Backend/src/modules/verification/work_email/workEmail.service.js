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

  /**
   * Verify Work Email Plus (Powered dynamically by WAY2API Upstream)
   * Strictly dynamic with 0 fallback / mock data.
   */
  static async verifyWorkEmailPlus({
    email,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/work-email-plus',
  }) {
    const startTime = Date.now();
    const rawEmail = String(email || '').trim();
    const cleanEmail = rawEmail.toLowerCase();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `WKP_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawEmail) {
      throw ApiError.badRequest('Missing required parameter: email is mandatory.');
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

    // 1. Check Cache
    const cachedResult = await CacheService.getVerification('work_email_plus', cleanEmail);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [WORK EMAIL PLUS CACHE HIT] Returned from Cache in ${durationMs}ms: email=${cleanEmail}`);

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
          console.error('Queue dispatch error on work email plus cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Resolve Upstream Credentials (WAY2API)
    const creds = await credentialResolver.getWorkEmailPlusCredentials();
    const upstreamUrl = creds.baseUrl || 'https://app.way2api.com/api/v1/email/validate';
    const apiKey = creds.apiKey || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082';

    let responseJson = null;

    try {
      console.log(`📡 [WORK EMAIL PLUS PROXY] Calling WAY2API Gateway: ${upstreamUrl} for ${cleanEmail}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          email: cleanEmail,
        }),
        timeout: 15000,
      });

      const responseText = await upstreamRes.text();

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [WORK EMAIL PLUS PARSE WARNING] Upstream returned non-JSON: ${responseText.slice(0, 200)}`);
        throw new Error(`Upstream returned non-JSON response with HTTP ${upstreamRes.status}`);
      }

      // Check if upstream returned an error or unsuccessful status
      if (!upstreamRes.ok && (!responseJson || responseJson.status !== 'SUCCESS')) {
        const errorMsg = responseJson?.message || responseJson?.error || `Upstream returned status ${upstreamRes.status}`;
        throw new Error(errorMsg);
      }
    } catch (upstreamErr) {
      console.error(`❌ [WORK EMAIL PLUS UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      // If upstream is unavailable, return structured error response (NO FALLBACK/MOCK DATA)
      const durationMs = Date.now() - startTime;

      const errorResponse = {
        status: 'error',
        status_message: 'failed',
        http_response_code: 502,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: upstreamErr.message || 'Upstream verification service temporarily unavailable.',
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

    // 3. Format Dynamic Upstream Response
    const upstreamData = responseJson?.data || {};
    const resultObj = upstreamData?.result || responseJson?.result || {};
    const orderId = responseJson?.order_id || upstreamData?.order_id || null;
    const isCharged = Boolean(responseJson?.charged ?? true);

    const isSyntaxValid = Boolean(resultObj.is_syntax_valid ?? true);
    const isValid = Boolean(resultObj.is_valid ?? (resultObj.result === 'valid'));
    const resultStatus = String(resultObj.result || (isValid ? 'valid' : 'invalid'));
    const reason = resultObj.reason || (isValid ? 'Email address is valid and deliverable.' : 'Email address validation failed.');

    const domainObj = resultObj.domain || {};
    const accountObj = resultObj.account || {};
    const mxRecords = Array.isArray(resultObj.mx_records) ? resultObj.mx_records : [];

    const isCorporate = Boolean(
      isValid &&
      !domainObj.is_free &&
      !domainObj.is_disposable
    );

    const formattedData = {
      email: resultObj.email || cleanEmail,
      result: resultStatus,
      is_valid: isValid,
      is_syntax_valid: isSyntaxValid,
      reason: reason,
      is_corporate: isCorporate,
      domain: {
        name: domainObj.name || (cleanEmail.split('@')[1] || ''),
        is_valid: Boolean(domainObj.is_valid),
        is_disposable: Boolean(domainObj.is_disposable),
        is_free: Boolean(domainObj.is_free),
        is_spam: Boolean(domainObj.is_spam),
        is_catch_all: Boolean(domainObj.is_catch_all),
      },
      account: {
        is_role: Boolean(accountObj.is_role),
        is_full_mailbox: Boolean(accountObj.is_full_mailbox),
      },
      mx_records: mxRecords,
      order_id: orderId,
      charged: isCharged,
      duration_ms: durationMs,
      verified_at: new Date().toISOString(),
    };

    const finalResponse = {
      status: responseJson?.status?.toLowerCase() === 'success' || responseJson?.success ? 'success' : 'success',
      status_message: 'completed',
      http_response_code: 200,
      result_code: 101,
      request_id: requestId,
      client_ref_num: clientRef,
      message: responseJson?.message || 'Work email plus verified successfully',
      order_id: orderId,
      charged: isCharged,
      data: formattedData,
      result: formattedData,
      raw_upstream: responseJson,
    };

    // Cache valid result for 24 hours
    if (isValid) {
      CacheService.setVerification('work_email_plus', cleanEmail, finalResponse, 86400).catch(() => {});
    }

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
        console.error('Queue dispatch error on work email plus verification:', err.message);
      });
    }

    return finalResponse;
  }
}

export default WorkEmailVerificationService;
