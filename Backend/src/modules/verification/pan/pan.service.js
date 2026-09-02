import { dbPool } from '../../../core/config/db.config.js';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import crypto from 'node:crypto';

export class PanVerificationService {
  /**
   * Validate PAN Format: 5 uppercase letters + 4 digits + 1 uppercase letter
   */
  static isValidPanFormat(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.trim().toUpperCase());
  }

  /**
   * Verify PAN Details with IDSPay upstream forwarding or high-fidelity sandbox simulation
   */
  static async verifyPan({ pan, name, pan_display_name, name_match_method, client_ref_num, apiClient }) {
    const startedAt = Date.now();
    const cleanPan = (pan || '').trim().toUpperCase();
    const cleanName = (name || '').trim();
    const requestId = `idspay-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(6).toString('hex')}`;
    const clientRef = client_ref_num || `ITV1_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/validation/pan`;

    let finalResponse;
    let resultCode;
    let isSuccess = false;

    // Check PAN Format
    const isValidFormat = this.isValidPanFormat(cleanPan);

    // 1. If IDSPay live master credentials are configured in .env, forward request to IDSPay Production
    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding request to IDSPay Production (Keep-Alive Enabled): ${upstreamUrl}`);
        console.log(`🔑 Master Creds Used: API_ID=${masterApiId}, PAN=${cleanPan}, Name=${cleanName}`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            pan: cleanPan,
            name: cleanName,
            pan_display_name: pan_display_name || 'false',
            name_match_method: name_match_method || 'fuzzy'
          })
        });

        console.log(`⏱️ [IDSPAY UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);

        const upstreamData = await upstreamRes.json();
        console.log(`📥 [IDSPAY PRODUCTION RESPONSE] Status ${upstreamRes.status}:`, JSON.stringify(upstreamData, null, 2));

        finalResponse = upstreamData;
        resultCode = upstreamData.result_code || (upstreamRes.ok ? 101 : 102);
        isSuccess = resultCode === 101;
      } catch (err) {
        console.error('⚠️ IDSPay upstream provider call failed:', err.message);
      }
    } else {
      console.log('ℹ️ No IDSPay master keys found in .env, using gateway simulated sandbox.');
    }

    // If no upstream provider configured or in simulation mode
    if (!finalResponse) {
      if (!isValidFormat || cleanPan.startsWith('INVALID')) {
        // Verification Failure Response (200 · 102)
        resultCode = 102;
        isSuccess = false;
        finalResponse = {
          http_response_code: 200,
          result_code: 102,
          request_id: requestId,
          client_ref_num: clientRef,
          message: 'Invalid Pan number or combination of inputs',
          status_message: 'Refund processed',
          result: {
            pan: cleanPan || 'XXXXXXX',
            pan_status: 'Invalid',
            pan_type: '',
            fullname: '',
            first_name: '',
            middle_name: '',
            last_name: '',
            gender: '',
            aadhaar_seeding_status: '',
            aadhaar_number: '',
            aadhaar_linked: '',
            dob: '',
            address: {
              building_name: '',
              locality: '',
              street_name: '',
              pincode: '',
              city: '',
              state: '',
              country: ''
            },
            mobile: '',
            email: ''
          }
        };
      } else {
        // Success Verification Response (200 · 101)
        resultCode = 101;
        isSuccess = true;
        const nameParts = (cleanName || 'Aarav Sharma').split(' ');
        const firstName = nameParts[0] || 'SUXXXX';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'XXXXX';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const panType = cleanPan[3] === 'P' ? 'Individual' : cleanPan[3] === 'C' ? 'Company' : 'Individual';

        finalResponse = {
          http_response_code: 200,
          result_code: 101,
          request_id: requestId,
          client_ref_num: clientRef,
          result: {
            pan: cleanPan,
            pan_type: panType,
            fullname: cleanName || `${firstName} ${lastName}`,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            gender: 'male',
            aadhaar_seeding_status: 'Y',
            aadhaar_number: 'XXXXXXXX1445',
            aadhaar_linked: true,
            dob: '07/11/1980',
            address: {
              building_name: '202, Shanti Heights',
              locality: 'Hazratganj',
              street_name: 'MG Road',
              pincode: '226001',
              city: 'Lucknow',
              state: 'Uttar Pradesh',
              country: 'India'
            },
            mobile: '90XXXXXX34',
            email: 'ab******************ol@gmail.com',
            name_match: Boolean(cleanName),
            name_match_score: cleanName ? 100 : 0
          }
        };
      }
    }

    const durationMs = Date.now() - startedAt;
    const hitCost = apiClient?.environment === 'production' ? 1.50 : 0.00;

    // 2. Settle Wallet & Log Hit in Background
    if (apiClient?.user_id) {
      this.recordHitAndSettleWallet({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint: '/srv2/validation/pan',
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment,
        isSuccess
      }).catch((err) => console.error('Failed to log hit:', err.message));
    }

    return finalResponse;
  }

  /**
   * Record Hit Log and Manage Wallet Debit / Refund
   */
  static async recordHitAndSettleWallet({
    userId,
    credentialId,
    endpoint,
    method,
    requestId,
    clientRefNum,
    statusCode,
    resultCode,
    durationMs,
    clientIp,
    cost,
    environment,
    isSuccess
  }) {
    try {
      // 1. Insert Hit Log
      const logQuery = `
        INSERT INTO api_hit_logs (user_id, credential_id, endpoint, method, request_id, client_ref_num, status_code, result_code, latency_ms, client_ip, cost, environment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await dbPool.query(logQuery, [
        userId,
        credentialId,
        endpoint,
        method,
        requestId,
        clientRefNum,
        statusCode,
        resultCode,
        durationMs,
        clientIp,
        cost,
        environment
      ]);

      // 2. Production Wallet Deduction / Refund Handling
      if (environment === 'production' && cost > 0) {
        if (isSuccess) {
          // Debit wallet for successful verification
          await dbPool.query(
            'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
            [cost, userId]
          );

          const [[user]] = await dbPool.query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
          const balanceAfter = parseFloat(user?.wallet_balance || '0.00');

          await dbPool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, category, description, reference_id)
             VALUES (?, 'debit', ?, ?, 'api_usage', 'PAN Verification API Hit', ?)`,
            [userId, cost, balanceAfter, requestId]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error recording API hit log/wallet:', error.message);
    }
  }
}

export default PanVerificationService;
