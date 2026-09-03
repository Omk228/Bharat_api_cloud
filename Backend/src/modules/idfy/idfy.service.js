import crypto from 'node:crypto';
import { ENV } from '../../core/config/env.config.js';
import { upstreamFetch } from '../../core/utils/httpAgent.js';
import CacheService from '../../core/cache/cache.service.js';
import QueueService from '../../core/queue/queue.service.js';
import { getApiPrice } from '../../core/config/pricing.config.js';
import { ApiError } from '../../core/utils/apiError.js';

export class IdfyService {
  /**
   * Helper delay for polling
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
   * Validate Bank Account using IDFY Async Task API
   * Step 1: POST /v3/tasks/async/verify_with_source/validate_bank_account
   * Step 2: GET /v3/tasks?request_id={request_id} (Polling until completion)
   */
  static async validateBankAccount({
    bank_account_no,
    bank_ifsc_code,
    nf_verification = true,
    client_ref_num,
    apiClient
  }) {
    const startTime = Date.now();
    const cleanAccount = String(bank_account_no || '').trim();
    const cleanIfsc = String(bank_ifsc_code || '').trim().toUpperCase();
    const isNf = nf_verification !== false && nf_verification !== 'false';
    const cacheKey = `${cleanAccount}_${cleanIfsc}_${isNf}`;
    const clientRef = client_ref_num || `BHARAT_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const endpoint = '/validate_bank_account';
    const hitCost = getApiPrice(endpoint) || 2.00;

    // 1. Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 2. Check Smart Cache first (<2ms)
    if (cleanAccount && cleanIfsc) {
      const cachedResult = await CacheService.getVerification('idfy_bank', cacheKey);
      if (cachedResult) {
        const durationMs = Date.now() - startTime;
        console.log(`⚡ [IDFY BANK CACHE HIT] Returned in ${durationMs}ms: Account=${cleanAccount.slice(0, 4)}XXXX${cleanAccount.slice(-3)}, IFSC=${cleanIfsc}`);

        const cachedResponse = {
          ...cachedResult,
          client_ref_num: clientRef,
          _cached: true
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
            resultCode: cachedResponse.result_code || 101,
            durationMs,
            clientIp: apiClient.client_ip,
            cost: hitCost,
            environment: apiClient.environment || 'production',
            isSuccess: cachedResponse.result_code === 101
          }).catch(() => {});
        }

        return cachedResponse;
      }
    }

    // 3. Step 1: POST to IDFY Async Task Creation
    const taskId = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const groupId = `group_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const postUrl = `${ENV.IDFY.BASE_URL}/tasks/async/verify_with_source/validate_bank_account`;

    const headers = {
      'Content-Type': 'application/json',
      'api-key': ENV.IDFY.API_KEY,
      'account-id': ENV.IDFY.ACCOUNT_ID
    };

    console.log(`📡 [IDFY UPSTREAM] Creating async bank validation task: Account=${cleanAccount.slice(0, 4)}XXXX, IFSC=${cleanIfsc}, nf=${isNf}`);

    const postRes = await upstreamFetch(postUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        task_id: taskId,
        group_id: groupId,
        data: {
          bank_account_no: cleanAccount,
          bank_ifsc_code: cleanIfsc,
          nf_verification: isNf
        }
      })
    });

    const postData = await postRes.json();
    console.log(`📥 [IDFY POST STATUS ${postRes.status}]:`, postData);

    const requestId = postData.request_id;
    if (!requestId) {
      throw new Error(postData.message || postData.error || 'Failed to initiate IDFY bank account validation task.');
    }

    // 4. Step 2: Poll GET /v3/tasks?request_id={requestId} until completed
    const getUrl = `${ENV.IDFY.BASE_URL}/tasks?request_id=${encodeURIComponent(requestId)}`;
    let task = null;
    const maxAttempts = 10;
    const pollIntervalMs = 800;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.delay(pollIntervalMs);

      try {
        const getRes = await upstreamFetch(getUrl, {
          method: 'GET',
          headers: {
            'api-key': ENV.IDFY.API_KEY,
            'account-id': ENV.IDFY.ACCOUNT_ID
          }
        });

        const getData = await getRes.json();
        const currentTask = Array.isArray(getData) ? getData[0] : getData;

        console.log(`🔄 [IDFY POLL ATTEMPT ${attempt}/${maxAttempts}] Status: ${currentTask?.status}`);

        if (currentTask?.status === 'completed' || currentTask?.status === 'failed') {
          task = currentTask;
          break;
        }
      } catch (err) {
        console.warn(`⚠️ [IDFY POLL RETRY ${attempt}]:`, err.message);
      }
    }

    if (!task) {
      // In case polling timed out before upstream finished
      task = {
        request_id: requestId,
        status: 'in_progress',
        result: {
          status: 'in_progress',
          account_exists: 'UNKNOWN',
          name_at_bank: null,
          message: 'Task processing in background at IDFY upstream.'
        }
      };
    }

    // 5. Normalize response to Bharat API Cloud standards
    const taskResult = task.result || {};
    const isAccountValid = taskResult.account_exists === 'YES' || taskResult.status === 'id_found';
    const beneficiaryName = taskResult.name_at_bank || '';
    const resultCode = isAccountValid ? 101 : 102;
    const durationMs = Date.now() - startTime;

    const finalResponse = {
      http_response_code: 200,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      message: isAccountValid
        ? 'Bank Account Verified Successfully (Penny Less)'
        : (taskResult.message || 'Bank Account Verification Failed / Not Found'),
      status_message: isAccountValid ? 'Verification success' : 'Verification failed',
      result: {
        creditorAccountId: cleanAccount,
        account_number: cleanAccount,
        ifscCode: cleanIfsc,
        ifsc: cleanIfsc,
        beneficiary_name: beneficiaryName,
        fullname: beneficiaryName,
        creditorName: beneficiaryName,
        name_at_bank: beneficiaryName,
        account_exists: taskResult.account_exists === 'YES',
        is_valid: isAccountValid,
        account_status: isAccountValid ? 'ACTIVE' : 'INVALID',
        verification_status: taskResult.status || task.status,
        verification_type: taskResult.type || (isNf ? 'NF' : 'F'),
        idfy_status: taskResult.status || task.status,
        idfy_type: taskResult.type || (isNf ? 'NF' : 'F'),
        amount_deposited: taskResult.amount_deposited || '0',
        task_id: task.task_id || taskId,
        group_id: task.group_id || groupId
      },
      data: task
    };

    // 6. Cache in Redis if completed
    if (task.status === 'completed') {
      await CacheService.setVerification('idfy_bank', cacheKey, finalResponse, 86400);
    }

    // 7. Audit log in BullMQ
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess: isAccountValid
      }).catch(() => {});
    }

    return finalResponse;
  }
}

export default IdfyService;
