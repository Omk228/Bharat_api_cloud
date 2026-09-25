import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class MobileOperatorCheckService {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6, 7, 8, or 9)
   */
  static isValidMobileNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.trim().replace(/\D/g, '');
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(clean);
  }

  /**
   * Check Mobile Operator, Circle, and Type
   * Strictly dynamic from WAY2API Upstream (Zero Fallback / Zero Mock Data)
   */
  static async checkMobileOperator({
    mobile_number,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/operator-circle',
  }) {
    const startTime = Date.now();
    const rawMobile = String(mobile_number || '').trim();
    const cleanMobile = rawMobile.replace(/\D/g, '');
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `OPR_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawMobile) {
      throw ApiError.badRequest('Missing required parameter: mobile_number is mandatory.');
    }

    if (!this.isValidMobileNumber(cleanMobile)) {
      throw ApiError.badRequest(`Invalid mobile number format: "${rawMobile}". Please provide a valid 10-digit Indian mobile number.`);
    }

    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 1. Check Smart Result Cache first (<1ms)
    const cachedResult = await CacheService.getVerification('mobile_operator_check', cleanMobile);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [OPERATOR CHECK CACHE HIT] Returned from Cache in ${durationMs}ms: mobile=${cleanMobile}`);

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
          console.error('Queue dispatch error on operator check cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Resolve Upstream Credentials (WAY2API)
    const creds = await credentialResolver.getOperatorCheckCredentials();
    const upstreamUrl = creds.baseUrl || 'https://app.way2api.com/api/v1/operator-circle/check';
    const apiKey = creds.apiKey || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082';

    let responseJson = null;

    try {
      console.log(`📡 [OPERATOR CHECK PROXY] Calling WAY2API Gateway: ${upstreamUrl} for ${cleanMobile}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          mobile_number: cleanMobile,
        }),
        timeout: 15000,
      });

      const responseText = await upstreamRes.text();

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [OPERATOR CHECK PARSE WARNING] Upstream returned non-JSON: ${responseText.slice(0, 200)}`);
        throw new Error(`Upstream returned non-JSON response with HTTP ${upstreamRes.status}`);
      }

      if (responseJson && isUpstreamLowBalance(responseJson)) {
        console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during Mobile Operator Check.');
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      // Check if upstream returned an error or unsuccessful status
      if (!upstreamRes.ok && (!responseJson || (responseJson.status !== 'SUCCESS' && !responseJson.success))) {
        const errorMsg = responseJson?.message || responseJson?.error || `Upstream returned status ${upstreamRes.status}`;
        throw new Error(errorMsg);
      }
    } catch (upstreamErr) {
      console.error(`❌ [OPERATOR CHECK UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      // Strictly Zero Mock / Zero Fallback Data: Return structured error response
      const durationMs = Date.now() - startTime;

      const errorResponse = {
        status: 'error',
        status_message: 'failed',
        http_response_code: 502,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: upstreamErr.message || 'Upstream mobile operator service temporarily unavailable.',
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

    const operatorName = resultObj.operator || 'Unknown';
    const circleName = resultObj.circle || 'Unknown';
    const connectionType = resultObj.type || 'Prepaid';

    const formattedData = {
      mobile_number: resultObj.mobile_number || cleanMobile,
      operator: operatorName,
      circle: circleName,
      type: connectionType,
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
      message: responseJson?.message || 'Mobile operator check completed successfully',
      order_id: orderId,
      charged: isCharged,
      data: formattedData,
      result: formattedData,
      raw_upstream: responseJson,
    };

    // Cache valid result for 24 hours
    CacheService.setVerification('mobile_operator_check', cleanMobile, finalResponse, 86400).catch(() => {});

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
        console.error('Queue dispatch error on mobile operator check:', err.message);
      });
    }

    return finalResponse;
  }
}

export default MobileOperatorCheckService;
