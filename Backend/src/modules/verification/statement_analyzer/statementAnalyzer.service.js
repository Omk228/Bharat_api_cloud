import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';

export class StatementAnalyzerService {
  /**
   * Universal Handler for Statement Analyzer PDF (Srv2)
   * Supports all 6 workflow methods:
   * 1. INITIATE_UPLOAD (Step 1)
   * 2. INITIATE_UPLOAD / File Upload (Step 2)
   * 3. COMPLETE_UPLOAD (Step 3)
   * 4. CHECK_STATUS (Step 4)
   * 5. RETRIEVE_STATEMENT (Step 5)
   * 6. CANCEL_REQUEST (Step 6)
   */
  static async processStatementAnalyzerRequest({
    method,
    acceptance_policy,
    token,
    request_id,
    file,
    txn_id,
    report_type,
    report_subtype,
    client_ref_num,
    apiClient,
    rawBody = {},
  }) {
    const startTime = Date.now();
    const endpoint = '/srv2/statement-upload';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`
      );
    }

    const masterApiId = ENV.IDSPAY.PROD_API_ID;
    const masterApiKey = ENV.IDSPAY.PROD_API_KEY;
    const masterTokenId = ENV.IDSPAY.PROD_TOKEN_ID;
    const upstreamUrl = `${ENV.IDSPAY.PROD_BASE_URL}/srv2/statement-analyzer`;

    const generatedRequestId = request_id || crypto.randomUUID();
    const clientRef = client_ref_num || `STA_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;

    // Helper to sanitize any upstream IDSPay URLs, domains, and provider references
    const hostBase = apiClient?.hostBase || 'http://localhost:5002';
    const sanitizeValue = (val) => {
      if (typeof val === 'string') {
        let out = val.replace(/https?:\/\/javabackend\.idspay\.in\/api\/v1\/prod/gi, hostBase);
        out = out.replace(/https?:\/\/javabackend\.idspay\.in/gi, hostBase);
        out = out.replace(/https?:\/\/[a-zA-Z0-9.-]*idspay\.in[^\s"']*/gi, (match) => {
          const path = match.replace(/https?:\/\/[^/]+/i, '');
          return `${hostBase}${path}`;
        });
        out = out.replace(/idspay/gi, 'Bharat API');
        out = out.replace(/IDSPAY/g, 'BHARAT_API');
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

    const effectiveMethod = (
      method ||
      rawBody.method ||
      rawBody.methodName ||
      (txn_id ? 'RETRIEVE_STATEMENT' : request_id && !file && !token ? 'CHECK_STATUS' : 'INITIATE_UPLOAD')
    ).trim();

    // acceptance_policy is ONLY for Step 1 (session initiation). Must NOT be passed in Step 2 (file upload)
    const hasTokenOrFile = Boolean(token || rawBody.token || file || rawBody.file);
    const effectiveAcceptancePolicy =
      acceptance_policy ||
      rawBody.acceptance_policy ||
      (effectiveMethod === 'INITIATE_UPLOAD' && !hasTokenOrFile ? 'atLeastOneTransactionInRange' : undefined);

    // Clean file payload if it contains data URI header
    let processedFile = file || rawBody.file;
    if (typeof processedFile === 'string' && processedFile.includes(';base64,')) {
      processedFile = processedFile.split(';base64,')[1];
    }

    // Construct upstream payload with server-side master credentials
    const upstreamPayload = {
      ...rawBody,
      api_id: masterApiId,
      api_key: masterApiKey,
      token_id: masterTokenId,
      ...(method || rawBody.method ? { method: method || rawBody.method } : {}),
      ...(effectiveAcceptancePolicy ? { acceptance_policy: effectiveAcceptancePolicy } : {}),
      ...(token || rawBody.token ? { token: token || rawBody.token } : {}),
      ...(request_id || rawBody.request_id ? { request_id: request_id || rawBody.request_id } : {}),
      ...(processedFile ? { file: processedFile } : {}),
      ...(txn_id || rawBody.txn_id ? { txn_id: txn_id || rawBody.txn_id } : {}),
      ...(report_type || rawBody.report_type
        ? { report_type: report_type || rawBody.report_type }
        : {}),
      ...(report_subtype || rawBody.report_subtype
        ? { report_subtype: report_subtype || rawBody.report_subtype }
        : {}),
    };

    const effectiveToken = token || rawBody.token;
    const effectiveRequestId = request_id || rawBody.request_id;
    const isExplicitSubMethod = Boolean(method || rawBody.method) &&
      ['CHECK_STATUS', 'RETRIEVE_STATEMENT', 'CANCEL_REQUEST', 'COMPLETE_UPLOAD'].includes(String(method || rawBody.method).toUpperCase());

    // -------------------------------------------------------------
    // CASE A: 1-SHOT AUTOMATED STATEMENT ANALYSIS PIPELINE
    // When a file is provided and no specific sub-method is requested
    // -------------------------------------------------------------
    if (processedFile && !isExplicitSubMethod && masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`🚀 [1-SHOT PIPELINE] Executing complete Statement Analyzer pipeline in 1 hit...`);

        // 1. INITIATE_UPLOAD
        console.log(`📡 [PIPELINE 1/4] Initiating upload session with upstream...`);
        const initPayload = {
          api_id: masterApiId,
          api_key: masterApiKey,
          token_id: masterTokenId,
          method: 'INITIATE_UPLOAD',
          acceptance_policy: effectiveAcceptancePolicy || 'atLeastOneTransactionInRange',
        };

        const initRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Id': masterApiId,
            'X-Api-Key': masterApiKey,
            'X-Token-Id': masterTokenId,
          },
          body: JSON.stringify(initPayload),
        });

        const initData = await initRes.json().catch(() => null);
        console.log(`📥 [PIPELINE 1/4 INIT RESPONSE] Status: ${initRes.status}`, JSON.stringify(initData));

        if (!initRes.ok || !initData || initData.status === 'error' || !initData.data?.token) {
          throw new Error(initData?.message || initData?.error?.msg || 'Failed to initiate statement upload session.');
        }

        const sessionToken = initData.data.token;
        const sessionRequestId = initData.data.request_id || initData.request_id;
        const uploadUrl = initData.data.url || 'https://svc.digitap.ai/bank-data/uploadstmt';

        // 2. STEP 2: INITIATE_UPLOAD WITH FILE & TOKEN (AS PER SPEC)
        console.log(`📡 [PIPELINE 2/4] Executing Step 2 INITIATE_UPLOAD with file to: ${upstreamUrl}...`);
        const step2Payload = {
          api_id: masterApiId,
          api_key: masterApiKey,
          token_id: masterTokenId,
          method: 'INITIATE_UPLOAD',
          token: sessionToken,
          request_id: sessionRequestId,
          file: processedFile,
        };

        const step2Res = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Id': masterApiId,
            'X-Api-Key': masterApiKey,
            'X-Token-Id': masterTokenId,
          },
          body: JSON.stringify(step2Payload),
        });

        const step2Data = await step2Res.json().catch(() => null);
        console.log(`📥 [PIPELINE 2/4 STEP 2 RESPONSE] Status: ${step2Res.status}`, JSON.stringify(step2Data));

        // Sync upload to Digitap uploadUrl if provided in step 1 response
        if (uploadUrl) {
          try {
            const fileBuffer = Buffer.isBuffer(processedFile)
              ? processedFile
              : Buffer.from(processedFile, 'base64');
            const blob = new Blob([fileBuffer], { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('token', sessionToken);
            formData.append('request_id', String(sessionRequestId));
            formData.append('file', blob, 'statement.pdf');

            const uploadTargetUrl = uploadUrl.includes('?')
              ? `${uploadUrl}&token=${encodeURIComponent(sessionToken)}`
              : `${uploadUrl}?token=${encodeURIComponent(sessionToken)}`;

            const directRes = await fetch(uploadTargetUrl, {
              method: 'POST',
              headers: {
                'token': sessionToken,
                'Authorization': sessionToken,
              },
              body: formData,
            });
            const directData = await directRes.json().catch(() => null);
            console.log(`📥 [PIPELINE 2/4 DIRECT SYNC RESPONSE] Status: ${directRes.status}`, JSON.stringify(directData));
          } catch (syncErr) {
            console.warn('Direct sync upload note:', syncErr.message);
          }
        }

        // 3. COMPLETE_UPLOAD
        console.log(`📡 [PIPELINE 3/4] Marking upload complete for request_id: ${sessionRequestId}...`);
        const completePayload = {
          api_id: masterApiId,
          api_key: masterApiKey,
          token_id: masterTokenId,
          method: 'COMPLETE_UPLOAD',
          request_id: sessionRequestId,
        };

        const completeRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Id': masterApiId,
            'X-Api-Key': masterApiKey,
            'X-Token-Id': masterTokenId,
          },
          body: JSON.stringify(completePayload),
        });

        const completeData = await completeRes.json().catch(() => null);
        console.log(`📥 [PIPELINE 3/4 COMPLETE RESPONSE] Status: ${completeRes.status}`, JSON.stringify(completeData));

        const finalTxnId = completeData?.txn_id || completeData?.data?.txn_id || initData.data?.txn_id || sessionRequestId;

        // 4. STEP 4: CHECK_STATUS (wait for OCR processing to complete)
        console.log(`📡 [PIPELINE 4/5] Checking analysis status for request_id: ${sessionRequestId}...`);
        const statusPayload = {
          api_id: masterApiId,
          api_key: masterApiKey,
          token_id: masterTokenId,
          method: 'CHECK_STATUS',
          request_id: sessionRequestId,
        };

        let isAnalysisReady = false;
        let lastStatusData = null;

        // Poll CHECK_STATUS up to 5 times (2s, 3s, 3s, 4s, 4s)
        const pollDelays = [2000, 3000, 3000, 4000, 4000];
        for (let attempt = 0; attempt < pollDelays.length; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, pollDelays[attempt]));

          const statusRes = await upstreamFetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Id': masterApiId,
              'X-Api-Key': masterApiKey,
              'X-Token-Id': masterTokenId,
            },
            body: JSON.stringify(statusPayload),
          });

          lastStatusData = await statusRes.json().catch(() => null);
          console.log(`📥 [PIPELINE 4/5 STATUS ATTEMPT ${attempt + 1}] Status: ${statusRes.status}`, JSON.stringify(lastStatusData));

          const statusStr = String(
            lastStatusData?.data?.status ||
            lastStatusData?.status?.type ||
            lastStatusData?.status ||
            ''
          ).toLowerCase();

          if (statusStr.includes('complete') || statusStr.includes('success')) {
            isAnalysisReady = true;
            break;
          }
        }

        // 5. STEP 5: RETRIEVE_STATEMENT
        console.log(`📡 [PIPELINE 5/5] Retrieving Statement Analysis report for txn_id: ${finalTxnId}...`);
        const retrievePayload = {
          api_id: masterApiId,
          api_key: masterApiKey,
          token_id: masterTokenId,
          method: 'RETRIEVE_STATEMENT',
          txn_id: finalTxnId,
          report_type: report_type || rawBody.report_type || 'json',
          report_subtype: report_subtype || rawBody.report_subtype || 'type3',
        };

        const retrieveRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Id': masterApiId,
            'X-Api-Key': masterApiKey,
            'X-Token-Id': masterTokenId,
          },
          body: JSON.stringify(retrievePayload),
        });

        const retrieveData = await retrieveRes.json().catch(() => null);
        console.log(`📥 [PIPELINE 5/5 RETRIEVE RESPONSE] Status: ${retrieveRes.status}`, JSON.stringify(retrieveData));

        const hasReport =
          retrieveRes.ok &&
          retrieveData &&
          retrieveData.status !== 'error' &&
          retrieveData?.status?.code !== 404 &&
          (retrieveData.data || retrieveData.summary || retrieveData.account_info || retrieveData.result);

        if (hasReport) {
          isSuccess = true;
          resultCode = 101;
          finalResponse = {
            http_response_code: 200,
            status_code: 200,
            status_message: 'SUCCESS',
            result_code: 101,
            message: 'Bank statement analysis completed successfully.',
            client_ref_num: clientRef,
            request_id: sessionRequestId,
            txn_id: finalTxnId,
            token: sessionToken,
            data: sanitizeValue(retrieveData.data || retrieveData),
          };
        } else {
          // Statement upload was successful, OCR analytics is still in progress upstream
          isSuccess = true;
          resultCode = 101;
          finalResponse = {
            http_response_code: 200,
            status_code: 200,
            status_message: 'PROCESSING',
            result_code: 101,
            message: 'Bank statement successfully uploaded. OCR analysis in progress.',
            client_ref_num: clientRef,
            request_id: sessionRequestId,
            txn_id: finalTxnId,
            token: sessionToken,
            data: {
              status: 'PROCESSING',
              request_id: sessionRequestId,
              txn_id: finalTxnId,
              message: 'Statement is being processed by OCR engine. You can fetch report using method CHECK_STATUS or RETRIEVE_STATEMENT.',
              status_info: sanitizeValue(lastStatusData?.data || lastStatusData || 'In Progress'),
            },
          };
        }

      } catch (err) {
        console.error(`❌ Statement Analysis 1-Shot Error:`, err.message);
        resultCode = 102;
        finalResponse = {
          http_response_code: 502,
          status_code: 502,
          status_message: 'BAD_GATEWAY',
          result_code: 102,
          message: `Statement Analyzer error: ${err.message}`,
          client_ref_num: clientRef,
          request_id: generatedRequestId,
        };
      }

    // -------------------------------------------------------------
    // CASE B: DIRECT SINGLE METHOD HIT (For explicit sub-method calls)
    // -------------------------------------------------------------
    } else if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] 1-Hit Direct Forward [Method: ${upstreamPayload.method || effectiveMethod}] to Upstream: ${upstreamUrl}`);

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
        console.log(`📥 [UPSTREAM RESPONSE] Status: ${upstreamRes.status}`, JSON.stringify(upstreamData));

        const isOk = upstreamRes.ok && upstreamData && upstreamData.status !== 'error' && upstreamData.status_code !== 400 && upstreamData.status_code !== 404 && upstreamData.status_code !== 500;

        if (isOk) {
          isSuccess = true;
          resultCode = 101;
          finalResponse = {
            http_response_code: 200,
            status_code: 200,
            status_message: 'SUCCESS',
            result_code: 101,
            message: upstreamData.message || upstreamData.status?.message || 'Request successful.',
            client_ref_num: clientRef,
            request_id: upstreamData.request_id || upstreamData.data?.request_id || generatedRequestId,
            token: upstreamData.token || upstreamData.data?.token || undefined,
            txn_id: upstreamData.txn_id || upstreamData.data?.txn_id || undefined,
            data: sanitizeValue(upstreamData.data || upstreamData.result || upstreamData),
          };
        } else {
          resultCode = 102;
          const upstreamCode = upstreamRes.status && upstreamRes.status !== 200 ? upstreamRes.status : (upstreamData?.status_code || 400);
          finalResponse = {
            http_response_code: upstreamCode,
            status_code: upstreamCode,
            status_message: 'FAILED',
            result_code: 102,
            message: upstreamData?.message || upstreamData?.status?.message || upstreamData?.error?.msg || 'Request failed.',
            client_ref_num: clientRef,
            request_id: generatedRequestId,
            error: sanitizeValue(upstreamData || null),
          };
        }
      } catch (err) {
        console.error(`❌ Upstream Statement Analyzer [${effectiveMethod}] Error:`, err.message);
        resultCode = 102;
        finalResponse = {
          http_response_code: 502,
          status_code: 502,
          status_message: 'BAD_GATEWAY',
          result_code: 102,
          message: `Upstream Statement Analyzer provider error: ${err.message}`,
          client_ref_num: clientRef,
          request_id: generatedRequestId,
        };
      }
    } else {
      // Sandbox Simulation Fallback
      isSuccess = true;
      resultCode = 101;
      const mockTxnId = `txn_${crypto.randomBytes(6).toString('hex')}`;
      const mockUploadToken = `TOK_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      let mockData = {};
      if (effectiveMethod === 'INITIATE_UPLOAD') {
        mockData = {
          method: 'INITIATE_UPLOAD',
          request_id: generatedRequestId,
          token: mockUploadToken,
          status: 'INITIATED',
          upload_url: `${hostBase}/srv2/statement-upload`,
          instructions: 'Upload the PDF file in step 2 with the generated token and request_id.',
        };
      } else if (effectiveMethod === 'COMPLETE_UPLOAD') {
        mockData = {
          method: 'COMPLETE_UPLOAD',
          request_id: generatedRequestId,
          txn_id: mockTxnId,
          status: 'PROCESSING',
          message: 'File upload marked as complete. Analysis in progress.',
        };
      } else if (effectiveMethod === 'CHECK_STATUS') {
        mockData = {
          method: 'CHECK_STATUS',
          request_id: generatedRequestId,
          txn_id: mockTxnId,
          status: 'COMPLETED',
          progress_percent: 100,
          total_pages: 5,
          total_transactions: 142,
        };
      } else if (effectiveMethod === 'RETRIEVE_STATEMENT') {
        mockData = {
          method: 'RETRIEVE_STATEMENT',
          txn_id: txn_id || mockTxnId,
          account_info: {
            bank_name: 'HDFC Bank',
            account_number: '50100234567890',
            account_type: 'Savings',
            holder_name: 'Aarav Sharma',
            statement_period: {
              from: '2026-01-01',
              to: '2026-06-30',
            },
          },
          summary: {
            total_credits: 450000.0,
            total_debits: 310000.0,
            average_monthly_balance: 125000.0,
            net_inflow: 140000.0,
            salary_detected: true,
            monthly_salary_estimate: 75000.0,
          },
          report_type: report_type || 'json',
          report_subtype: report_subtype || 'type3',
        };
      } else if (effectiveMethod === 'CANCEL_REQUEST') {
        mockData = {
          method: 'CANCEL_REQUEST',
          request_id: generatedRequestId,
          status: 'CANCELLED',
          message: 'Statement analysis request cancelled successfully.',
        };
      }

      finalResponse = {
        http_response_code: 200,
        status_code: 200,
        status_message: 'SUCCESS',
        result_code: 101,
        message: `Statement Analyzer [${effectiveMethod}] processed successfully (Sandbox).`,
        client_ref_num: clientRef,
        request_id: generatedRequestId,
        data: mockData,
      };
    }

    const durationMs = Date.now() - startTime;

    // Asynchronously dispatch audit job and wallet debit
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId: generatedRequestId,
        clientRefNum: clientRef,
        statusCode: finalResponse.http_response_code || 200,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error in Statement Analyzer service:', err.message);
      });
    }

    return finalResponse;
  }
}

export default StatementAnalyzerService;
