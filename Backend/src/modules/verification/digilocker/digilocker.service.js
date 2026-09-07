import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';

export class DigilockerVerificationService {
  /**
   * Universal Handler for DigiLocker Digital KYC (generateToken & fetchDetails)
   */
  static async processDigilockerRequest({
    method = 'generateToken',
    redirect_url,
    redirectUrl,
    logo_url,
    logoUrl,
    aadhaar_number,
    aadhaar,
    client_id,
    clientId,
    client_ref_num,
    apiClient,
    rawBody = {},
  }) {
    const startTime = Date.now();
    const endpoint = '/srv2/validation/digilocker-digital-kyc';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/validation/digilocker-digital-kyc`;

    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `DLK_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;

    // Detect which method is requested: 'generateToken' or 'fetchDetails'
    const isFetchDetails =
      method === 'fetchDetails' ||
      Boolean(client_id || clientId || rawBody?.methods?.fetchDetails || rawBody?.fetchDetails);

    const effectiveMethod = isFetchDetails ? 'fetchDetails' : 'generateToken';

    // Helper to sanitize any upstream IDSPay URLs and references
    const hostBase = apiClient?.hostBase || 'http://localhost:5002';
    const sanitizeValue = (val) => {
      if (typeof val === 'string') {
        // Rewrite IDSPay DigiLocker start URL to Bharat API Gateway URL
        let out = val.replace(
          /https?:\/\/javabackend\.idspay\.in\/api\/v1\/prod\/srv2\/v1\/digilocker\/start\/([a-zA-Z0-9_-]+)/gi,
          `${hostBase}/srv2/v1/digilocker/start/$1`
        );
        out = out.replace(
          /https?:\/\/javabackend\.idspay\.in\/api\/v1\/prod\/srv2\/validation\/digilocker-digital-kyc\/auth/gi,
          `${hostBase}/srv2/validation/digilocker-digital-kyc/auth`
        );
        // Replace any remaining javabackend.idspay.in / idspay.in instances
        out = out.replace(/https?:\/\/javabackend\.idspay\.in\/api\/v1\/prod/gi, hostBase);
        out = out.replace(/https?:\/\/javabackend\.idspay\.in/gi, hostBase);
        out = out.replace(/https?:\/\/[a-zA-Z0-9.-]*idspay\.in[^\s"']*/gi, (match) => {
          const path = match.replace(/https?:\/\/[^/]+/i, '');
          return `${hostBase}${path}`;
        });
        out = out.replace(/idspay/gi, 'Bharat API');
        return out;
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeValue);
      }
      if (val !== null && typeof val === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(val)) {
          cleaned[k] = sanitizeValue(v);
        }
        return cleaned;
      }
      return val;
    };

    if (effectiveMethod === 'generateToken') {
      const genObj = rawBody?.methods?.generateToken || rawBody?.generateToken || {};
      const effectiveRedirectUrl = (
        redirect_url ||
        redirectUrl ||
        genObj.redirectUrl ||
        genObj.redirect_url ||
        genObj.RedirectUrl ||
        ''
      ).trim();

      const effectiveLogoUrl = (
        logo_url ||
        logoUrl ||
        genObj.logoUrl ||
        genObj.logo_url ||
        genObj.LogoUrl ||
        ''
      ).trim();

      const cleanAadhaar = (
        aadhaar_number ||
        aadhaar ||
        genObj.aadhaar_number ||
        genObj.aadhaar ||
        genObj['Aadhaar Number'] ||
        ''
      ).trim().replace(/\D/g, '');

      if (!effectiveRedirectUrl) {
        throw ApiError.badRequest('redirect_url is required for DigiLocker generateToken method.');
      }

      if (masterApiId && masterApiKey && masterTokenId) {
        try {
          console.log(`📡 [PROXY GATEWAY] Forwarding DigiLocker [generateToken] to Upstream: ${upstreamUrl}`);

          const upstreamPayload = {
            methods: {
              generateToken: {
                api_id: masterApiId,
                api_key: masterApiKey,
                token_id: masterTokenId,
                methodName: 'generateToken',
                ...(cleanAadhaar ? { aadhaar_number: cleanAadhaar, 'Aadhaar Number': cleanAadhaar } : {}),
                redirectUrl: effectiveRedirectUrl,
                RedirectUrl: effectiveRedirectUrl,
                ...(effectiveLogoUrl ? { logoUrl: effectiveLogoUrl, LogoUrl: effectiveLogoUrl } : {}),
              },
            },
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            method: 'generateToken',
            methodName: 'generateToken',
            RedirectUrl: effectiveRedirectUrl,
            redirectUrl: effectiveRedirectUrl,
            ...(effectiveLogoUrl ? { LogoUrl: effectiveLogoUrl, logoUrl: effectiveLogoUrl } : {}),
            ...(cleanAadhaar ? { 'Aadhaar Number': cleanAadhaar, aadhaar_number: cleanAadhaar } : {}),
          };

          const upstreamRes = await upstreamFetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Id': masterApiId,
              'X-Api-Key': masterApiKey,
              'X-Token-Id': masterTokenId,
            },
            body: JSON.stringify(upstreamPayload),
          });

          const upstreamData = await upstreamRes.json().catch(() => null);
          console.log(`📥 [UPSTREAM RESPONSE] Status: ${upstreamRes.status}`);

          if (upstreamRes.ok && upstreamData) {
            isSuccess = true;
            resultCode = 101;

            const rawData = upstreamData.data || {
              client_id: upstreamData.client_id,
              token: upstreamData.token,
              url: upstreamData.url,
              expiry_seconds: upstreamData.expiry_seconds || 1800,
            };

            finalResponse = {
              http_response_code: 200,
              status_code: 200,
              status_message: 'SUCCESS',
              result_code: 101,
              message:
                upstreamData.message ||
                upstreamData.status?.message ||
                'Digilocker Digital KYC Token generated successfully.',
              client_ref_num: clientRef,
              request_id: requestId,
              data: sanitizeValue(rawData),
            };
          } else {
            resultCode = 102;
            finalResponse = {
              http_response_code: upstreamRes.status || 400,
              status_code: upstreamRes.status || 400,
              status_message: 'FAILED',
              result_code: 102,
              message:
                upstreamData?.message ||
                upstreamData?.status?.message ||
                'Failed to generate DigiLocker KYC token from upstream.',
              client_ref_num: clientRef,
              request_id: requestId,
              error: sanitizeValue(upstreamData || null),
            };
          }
        } catch (err) {
          console.error('❌ Upstream DigiLocker generateToken Error:', err.message);
          resultCode = 102;
          finalResponse = {
            http_response_code: 502,
            status_code: 502,
            status_message: 'BAD_GATEWAY',
            result_code: 102,
            message: `Upstream DigiLocker provider error: ${err.message}`,
            client_ref_num: clientRef,
            request_id: requestId,
          };
        }
      } else {
        isSuccess = true;
        resultCode = 101;
        const mockToken = crypto.randomBytes(16).toString('hex');
        const mockClientId = `digilocker_${crypto.randomBytes(12).toString('base64url')}`;
        const mockSessionId = crypto.randomUUID();

        finalResponse = {
          http_response_code: 200,
          status_code: 200,
          status_message: 'SUCCESS',
          result_code: 101,
          message: 'Digilocker Digital KYC Token generated successfully (Sandbox).',
          client_ref_num: clientRef,
          request_id: requestId,
          data: {
            client_id: mockClientId,
            token: mockToken,
            url: `${hostBase}/srv2/v1/digilocker/start/${mockSessionId}`,
            expiry_seconds: 1800,
          },
        };
      }
    } else {
      // fetchDetails Method
      const fetchObj = rawBody?.methods?.fetchDetails || rawBody?.fetchDetails || {};
      const effectiveClientId = (client_id || clientId || fetchObj.client_id || fetchObj.clientId || '').trim();

      if (!effectiveClientId) {
        throw ApiError.badRequest('client_id is required for DigiLocker fetchDetails method.');
      }

      if (masterApiId && masterApiKey && masterTokenId) {
        try {
          console.log(`📡 [PROXY GATEWAY] Forwarding DigiLocker [fetchDetails] to Upstream: ${upstreamUrl}`);

          const upstreamPayload = {
            methods: {
              fetchDetails: {
                api_id: masterApiId,
                api_key: masterApiKey,
                token_id: masterTokenId,
                methodName: 'fetchDetails',
                client_id: effectiveClientId,
              },
            },
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            method: 'fetchDetails',
            methodName: 'fetchDetails',
            client_id: effectiveClientId,
          };

          const upstreamRes = await upstreamFetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Id': masterApiId,
              'X-Api-Key': masterApiKey,
              'X-Token-Id': masterTokenId,
            },
            body: JSON.stringify(upstreamPayload),
          });

          const upstreamData = await upstreamRes.json().catch(() => null);
          console.log(`📥 [UPSTREAM RESPONSE] Status: ${upstreamRes.status}`);

          if (upstreamRes.ok && upstreamData) {
            isSuccess = true;
            resultCode = 101;

            const rawDetails = upstreamData.data || upstreamData.result || upstreamData;

            finalResponse = {
              http_response_code: 200,
              status_code: 200,
              status_message: 'SUCCESS',
              result_code: 101,
              message:
                upstreamData.message ||
                upstreamData.status?.message ||
                'Digilocker Digital KYC Details fetched successfully.',
              client_ref_num: clientRef,
              request_id: requestId,
              data: sanitizeValue(rawDetails),
            };
          } else {
            resultCode = 102;
            finalResponse = {
              http_response_code: upstreamRes.status || 400,
              status_code: upstreamRes.status || 400,
              status_message: 'FAILED',
              result_code: 102,
              message:
                upstreamData?.message ||
                upstreamData?.status?.message ||
                'Failed to fetch DigiLocker KYC details from upstream.',
              client_ref_num: clientRef,
              request_id: requestId,
              error: sanitizeValue(upstreamData || null),
            };
          }
        } catch (err) {
          console.error('❌ Upstream DigiLocker fetchDetails Error:', err.message);
          resultCode = 102;
          finalResponse = {
            http_response_code: 502,
            status_code: 502,
            status_message: 'BAD_GATEWAY',
            result_code: 102,
            message: `Upstream DigiLocker provider error: ${err.message}`,
            client_ref_num: clientRef,
            request_id: requestId,
          };
        }
      } else {
        isSuccess = true;
        resultCode = 101;

        finalResponse = {
          http_response_code: 200,
          status_code: 200,
          status_message: 'SUCCESS',
          result_code: 101,
          message: 'Digilocker Digital KYC Details fetched successfully (Sandbox).',
          client_ref_num: clientRef,
          request_id: requestId,
          data: {
            client_id: effectiveClientId,
            kyc_status: 'COMPLETED',
            aadhaar_number: 'XXXXXXXX1445',
            name: 'Aarav Sharma',
            dob: '1990-04-12',
            gender: 'M',
            address: 'New Delhi, India',
          },
        };
      }
    }

    const durationMs = Date.now() - startTime;

    // Asynchronously dispatch audit job and wallet debit
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: finalResponse.http_response_code || 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error in DigiLocker service:', err.message);
      });
    }

    return finalResponse;
  }
}

export default DigilockerVerificationService;
