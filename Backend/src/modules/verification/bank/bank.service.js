import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';
import IdfyService from '../../idfy/idfy.service.js';

export class BankVerificationService {
  /**
   * Validate Indian Bank Account Number: 9 to 18 digits
   */
  static isValidAccountNumber(account) {
    if (!account || typeof account !== 'string') return false;
    const clean = account.trim();
    return /^\d{9,18}$/.test(clean);
  }

  /**
   * Validate Indian Bank IFSC Code: 4 Letters + '0' + 6 Alphanumeric characters
   */
  static isValidIfsc(ifsc) {
    if (!ifsc || typeof ifsc !== 'string') return false;
    const clean = ifsc.trim().toUpperCase();
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
  }

  /**
   * Bank Verification Penny Less V2 (/idfc/beneficiary)
   */
  static async verifyBankPennyLess({
    creditorAccountId,
    ifscCode,
    client_ref_num,
    apiClient
  }) {
    const startTime = Date.now();
    const cleanAccount = String(creditorAccountId || '').trim();
    const cleanIfsc = String(ifscCode || '').trim().toUpperCase();
    const cacheKeyIdentifier = `${cleanAccount}_${cleanIfsc}`;
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `ITV1_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/idfc/beneficiary';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. Check Smart Result Cache first (<2ms) 🔥
    if (cleanAccount && cleanIfsc) {
      const cachedResult = await CacheService.getVerification('bank', cacheKeyIdentifier);
      if (cachedResult) {
        const durationMs = Date.now() - startTime;
        console.log(`⚡ [BANK CACHE HIT] Returned from Cache in ${durationMs}ms: Account=${cleanAccount.slice(0, 4)}XXXX${cleanAccount.slice(-3)}, IFSC=${cleanIfsc}`);

        const cachedResponse = {
          ...cachedResult,
          request_id: cachedResult.request_id || requestId,
          client_ref_num: clientRef,
          _cached: true
        };

        if (apiClient?.user_id) {
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint: '/idfc/beneficiary',
            method: 'POST',
            requestId: cachedResponse.request_id,
            clientRefNum: clientRef,
            statusCode: cachedResponse.http_response_code || 200,
            resultCode: cachedResponse.result_code || 101,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: hitCost,
            environment: apiClient.environment || 'production',
            isSuccess: true
          }).catch(() => {});
        }

        return cachedResponse;
      }
    }

    // 2. Cache Miss: Forward to IDFY Live Upstream Provider
    if (ENV.IDFY?.API_KEY && ENV.IDFY?.ACCOUNT_ID) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding Bank Penny Less request to IDFY: Account=${cleanAccount.slice(0, 4)}XXXX, IFSC=${cleanIfsc}`);
        return await IdfyService.validateBankAccount({
          bank_account_no: cleanAccount,
          bank_ifsc_code: cleanIfsc,
          nf_verification: true,
          client_ref_num,
          apiClient
        });
      } catch (err) {
        console.error('⚠️ IDFY Bank upstream provider call failed, falling back:', err.message);
      }
    }

    // 3. Fallback: Forward to IDSPay Upstream Provider
    const idspayCreds = await credentialResolver.getIdspayCredentials();
    const masterApiId = idspayCreds.apiId;
    const masterApiKey = idspayCreds.apiKey;
    const masterTokenId = idspayCreds.tokenId;
    const upstreamUrl = `${idspayCreds.baseUrl}/idfc/beneficiary`;

    let finalResponse;
    let resultCode;
    let isSuccess = false;

    const isValidAcc = this.isValidAccountNumber(cleanAccount);
    const isValidIfscCode = this.isValidIfsc(cleanIfsc);

    // If IDSPay live master credentials are configured in .env, forward request to IDSPay Production
    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding Bank Penny Less request to IDSPay: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, Account=${cleanAccount.substring(0, 4)}XXXX, IFSC=${cleanIfsc}`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            creditorAccountId: cleanAccount,
            ifscCode: cleanIfsc
          })
        });

        console.log(`⏱️ [IDSPAY BANK UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [IDSPAY BANK RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        if (isUpstreamLowBalance(upstreamData)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during Bank verification.');
          finalResponse = formatUpstreamLowBalanceResponse(requestId, clientRef);
          resultCode = 102;
          isSuccess = false;
        } else {
          const resourceData = upstreamData?.data?.beneValidationResp?.resourceData || upstreamData?.result || upstreamData?.data || {};
          const metaData = upstreamData?.data?.beneValidationResp?.metaData || {};
          const creditorName = resourceData?.creditorName || resourceData?.beneficiary_name || resourceData?.fullname || '';

          isSuccess = (upstreamData?.status?.code === 200 || upstreamData?.http_response_code === 200 || metaData?.status === 'SUCCESS' || Boolean(creditorName));
          resultCode = isSuccess ? 101 : 102;

          const responseRequestId = resourceData.transactionId || upstreamData.request_id || requestId;

          finalResponse = {
            http_response_code: 200,
            result_code: resultCode,
            request_id: responseRequestId,
            client_ref_num: resourceData?.clientRefNum || clientRef,
            message: upstreamData.message || (isSuccess ? 'Beneficiary validated successfully.' : 'Verification failed'),
            status_message: isSuccess ? 'Verification success' : 'Verification failed',
            result: {
              creditorAccountId: resourceData.creditorAccountId || cleanAccount,
              account_number: resourceData.creditorAccountId || cleanAccount,
              ifscCode: cleanIfsc,
              ifsc: cleanIfsc,
              beneficiary_name: creditorName,
              fullname: creditorName,
              creditorName: creditorName,
              rrn: resourceData.rrn || '',
              transactionReferenceNumber: resourceData.transactionReferenceNumber || '',
              transactionId: resourceData.transactionId || '',
              transactionTime: resourceData.transactionTime || '',
              responseCode: resourceData.responseCode || '',
              isNameMatch: resourceData.isNameMatch || false,
              matchingScore: resourceData.matchingScore || null,
              account_status: isSuccess ? 'ACTIVE' : 'INVALID',
              account_exists: isSuccess,
              is_valid: isSuccess,
              ...resourceData
            },
            data: upstreamData.data || upstreamData
          };
        }
      } catch (err) {
        console.error('⚠️ Bank verification call failed:', err.message);
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
              result_code: 102,
              request_id: requestId,
              client_ref_num: clientRef,
              message: 'Server Error. Please try again later.',
              status_message: 'Server Error',
              result: null,
              data: null
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
        data: null
      };
    }

    const durationMs = Date.now() - startTime;

    // 3. Cache valid verification results in Redis for 24 hours (86,400 seconds) 🚀
    if (isSuccess && cleanAccount && cleanIfsc && (finalResponse?.result || finalResponse?.data)) {
      await CacheService.setVerification('bank', cacheKeyIdentifier, finalResponse, 86400);
      console.log(`💾 [BANK CACHED] Key verify:bank:${cacheKeyIdentifier} stored for 24h`);
    }

    // 4. Non-Blocking Background Job via BullMQ
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode: resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0.00,
        environment: apiClient.environment || 'production',
        isSuccess
      }).catch(err => {
        console.error('Queue dispatch note:', err.message);
      });
    }

    return finalResponse;
  }
}

export default BankVerificationService;
