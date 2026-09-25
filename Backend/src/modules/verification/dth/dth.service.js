import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class DthOperatorCheckService {
  /**
   * Sanitize and validate DTH Subscriber / Account Number
   */
  static sanitizeDthNumber(dth) {
    if (!dth || typeof dth !== 'string') return '';
    return dth.trim().replace(/[^\w-]/g, '');
  }

  /**
   * Check DTH Operator
   * Strictly dynamic from WAY2API Upstream (Zero Fallback / Zero Mock Data)
   */
  static async checkDthOperator({
    dth_number,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/dth-operator',
  }) {
    const startTime = Date.now();
    const rawDth = String(dth_number || '').trim();
    const cleanDth = this.sanitizeDthNumber(rawDth);
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `DTH_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawDth || !cleanDth) {
      throw ApiError.badRequest('Missing required parameter: dth_number is mandatory.');
    }

    if (cleanDth.length < 5 || cleanDth.length > 25) {
      throw ApiError.badRequest(`Invalid DTH number format: "${rawDth}". DTH / Subscriber ID must be between 5 and 25 characters.`);
    }

    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 1. Check Smart Result Cache first (<1ms)
    const cachedResult = await CacheService.getVerification('dth_operator_check', cleanDth);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [DTH OPERATOR CACHE HIT] Returned from Cache in ${durationMs}ms: dth=${cleanDth}`);

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
          console.error('Queue dispatch error on DTH operator check cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Resolve Upstream Credentials (WAY2API)
    const creds = await credentialResolver.getDthCheckCredentials();
    const upstreamUrl = creds.baseUrl || 'https://app.way2api.com/api/v1/dth/operator-check';
    const apiKey = creds.apiKey || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082';

    let responseJson = null;

    try {
      console.log(`📡 [DTH OPERATOR PROXY] Calling WAY2API Gateway: ${upstreamUrl} for ${cleanDth}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          dth_number: cleanDth,
        }),
        timeout: 15000,
      });

      const rawText = await upstreamRes.text();
      try {
        responseJson = JSON.parse(rawText);
      } catch (e) {
        console.error(`❌ [DTH OPERATOR PROXY] Non-JSON Upstream response: ${rawText}`);
        throw new Error(`Upstream returned non-JSON response (HTTP ${upstreamRes.status}): ${rawText.slice(0, 100)}`);
      }
    } catch (fetchErr) {
      console.error(`❌ [DTH OPERATOR PROXY ERROR] Upstream fetch failure:`, fetchErr.message);
      throw ApiError.badGateway(`Upstream DTH Operator Check provider connection error: ${fetchErr.message}`);
    }

    // 3. Inspect Upstream Response for Low Balance
    if (isUpstreamLowBalance(responseJson)) {
      console.error('🚨 [DTH OPERATOR PROXY] Upstream WAY2API Provider Low Balance detected:', responseJson);
      return formatUpstreamLowBalanceResponse(responseJson, requestId, clientRef);
    }

    // 4. Handle Upstream Success vs Failed Response (Strictly Dynamic - 0% Fallback)
    const isSuccess =
      responseJson?.status === 'SUCCESS' ||
      responseJson?.status === 'success' ||
      responseJson?.success === true ||
      responseJson?.status_code === 200 ||
      (responseJson?.data && responseJson?.data?.result);

    const durationMs = Date.now() - startTime;

    if (!isSuccess) {
      const upstreamMsg =
        responseJson?.message ||
        responseJson?.error?.message ||
        responseJson?.msg ||
        'DTH operator verification failed or DTH number not found at upstream provider';

      console.warn(`⚠️ [DTH OPERATOR] Upstream verification returned unsuccessful:`, responseJson);

      const errorResponse = {
        status: responseJson?.status || 'FAILED',
        status_code: responseJson?.status_code || 400,
        http_response_code: 400,
        result_code: 102,
        charged: responseJson?.charged ?? false,
        success: false,
        message: upstreamMsg,
        message_code: responseJson?.message_code || 'VERIFICATION_FAILED',
        order_id: responseJson?.order_id || responseJson?.data?.order_id || null,
        request_id: requestId,
        client_ref_num: clientRef,
        data: responseJson?.data || null,
      };

      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'POST',
          requestId,
          clientRefNum: clientRef,
          statusCode: 400,
          resultCode: 102,
          durationMs,
          clientIp: apiClient.client_ip,
          cost: 0,
          environment: apiClient.environment || 'production',
          isSuccess: false,
        }).catch((err) => {
          console.error('Queue dispatch error on DTH operator failure:', err.message);
        });
      }

      return errorResponse;
    }

    // 5. Extract Dynamic Result
    const resData = responseJson.data || {};
    const resResult = resData.result || {};

    const extractedResult = {
      dth_number: resResult.dth_number || cleanDth,
      operator: resResult.operator || '',
      operator_name: resResult.operator_name || (resResult.operator ? resResult.operator.replace(/_/g, ' ').toUpperCase() : ''),
    };

    const finalResponse = {
      status: 'SUCCESS',
      status_code: 200,
      http_response_code: 200,
      result_code: 101,
      charged: responseJson.charged ?? true,
      success: true,
      message: responseJson.message || 'DTH Operator verified successfully',
      message_code: responseJson.message_code || 'OK',
      order_id: responseJson.order_id || resData.order_id || `W2A_${crypto.randomBytes(6).toString('hex')}`,
      request_id: requestId,
      client_ref_num: clientRef,
      data: {
        order_id: responseJson.order_id || resData.order_id || null,
        result: extractedResult,
      },
    };

    // 6. Cache Successful Results for 24 Hours
    CacheService.setVerification('dth_operator_check', cleanDth, finalResponse, 86400).catch((err) => {
      console.warn('Cache write error for DTH operator check:', err.message);
    });

    // 7. Dispatch Async Audit Log
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
        console.error('Queue dispatch error on DTH operator success:', err.message);
      });
    }

    return finalResponse;
  }
}

export default DthOperatorCheckService;
