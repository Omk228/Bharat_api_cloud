import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { dbPool } from '../../../core/config/db.config.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';
import StatementAnalyzerClient from './statementAnalyzer.client.js';

export class StatementAnalyzerService {
  /**
   * Helper to map upstream errors to standard sanitized BAC responses
   */
  static mapUpstreamError(upstreamStatus, upstreamData, fallbackMsg = 'Statement analysis service temporarily unavailable.') {
    const rawCode = upstreamData?.status?.code || upstreamData?.code || upstreamStatus;
    const rawMsg = upstreamData?.status?.message || upstreamData?.message || upstreamData?.error || upstreamData?.msg;
    const finalMsg = rawMsg || fallbackMsg;

    // Upstream validation / unprocessable error
    if (rawCode === 422 || upstreamStatus === 422) {
      return {
        httpCode: 422,
        isSuccess: false,
        resultCode: 102,
        response: {
          status: {
            code: 422,
            type: 'error',
            message: finalMsg,
          },
          message: finalMsg,
          result_code: 102,
          ...(upstreamData?.data ? { data: upstreamData.data } : {}),
        },
      };
    }

    // Upstream timeout
    if (rawCode === 504 || upstreamStatus === 504) {
      return {
        httpCode: 504,
        isSuccess: false,
        resultCode: 102,
        response: {
          status: {
            code: 504,
            type: 'error',
            message: finalMsg.includes('timed out') ? finalMsg : 'Statement analysis upstream request timed out.',
          },
          message: finalMsg.includes('timed out') ? finalMsg : 'Statement analysis upstream request timed out.',
          result_code: 102,
        },
      };
    }

    // Default upstream provider / server error (HTTP 502)
    return {
      httpCode: 502,
      isSuccess: false,
      resultCode: 102,
      response: {
        status: {
          code: 502,
          type: 'error',
          message: finalMsg,
        },
        message: finalMsg,
        result_code: 102,
        ...(upstreamData?.data ? { data: upstreamData.data } : {}),
      },
    };
  }

  /**
   * Main processor for Statement Analyzer PDF (Srv2)
   * Supports both 1-Shot automated pipeline and individual workflow steps.
   */
  static async processStatementAnalyzerRequest({
    method,
    acceptance_policy,
    token,
    request_id,
    file,
    filename = 'statement.pdf',
    password,
    txn_id,
    report_type,
    report_subtype,
    client_ref_num,
    correlationId = 'STA_REQ',
    apiClient,
  }) {
    const startTime = Date.now();
    const endpoint = '/api/v1/statement-analyzer';
    const hitCost = apiClient?.effective_price ?? (await getEffectiveApiPrice(endpoint, apiClient?.user_id));

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`
      );
    }

    const clientRef = client_ref_num || `STA_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const generatedRequestId = request_id || crypto.randomUUID();

    let finalResponse;
    let resultCode = 101;
    let isSuccess = false;
    let httpStatusCode = 200;

    const normalizedMethod = (method || '').trim().toUpperCase();
    const isExplicitStep = Boolean(normalizedMethod && ['INITIATE_UPLOAD', 'COMPLETE_UPLOAD', 'CHECK_STATUS', 'RETRIEVE_STATEMENT', 'CANCEL_REQUEST'].includes(normalizedMethod));

    try {
      // =========================================================================
      // MODE A: 1-SHOT AUTOMATED PIPELINE (When PDF is provided for analysis)
      // =========================================================================
      if (file && (!isExplicitStep || (normalizedMethod === 'INITIATE_UPLOAD' && !token && !request_id))) {
        // Step 0: Check MySQL DB cache for completed analysis of the exact same file
        const fileBuffer = Buffer.isBuffer(file) ? file : (file instanceof Uint8Array ? Buffer.from(file) : Buffer.from(file));
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        try {
          const [cachedRows] = await dbPool.query(
            `SELECT id, request_id, txn_id, status, analysis_data, created_at, completed_at 
             FROM bank_statement_analysis 
             WHERE file_hash = ? AND status = 'COMPLETED' AND analysis_data IS NOT NULL 
             ORDER BY id DESC LIMIT 1`,
            [fileHash]
          );

          if (cachedRows && cachedRows.length > 0 && cachedRows[0].analysis_data) {
            let parsedReport = cachedRows[0].analysis_data;
            if (typeof parsedReport === 'string') {
              try {
                parsedReport = JSON.parse(parsedReport);
              } catch (e) {
                // Return as-is if raw
              }
            }

            console.log(`[StatementAnalyzer][${correlationId}] Cache Hit (file_hash: ${fileHash.substring(0, 12)}...). Returning cached analysis with ZERO upstream hits.`);

            finalResponse = parsedReport;
            httpStatusCode = 200;
            isSuccess = true;
            resultCode = 101;

            const durationMs = Date.now() - startTime;
            if (apiClient?.user_id) {
              QueueService.addAuditJob({
                userId: apiClient.user_id,
                credentialId: apiClient.credential_id,
                endpoint,
                method: 'POST',
                requestId: generatedRequestId,
                clientRefNum: clientRef,
                statusCode: httpStatusCode,
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

            return {
              httpCode: httpStatusCode,
              body: finalResponse,
            };
          }
        } catch (cacheErr) {
          console.warn(`[StatementAnalyzer][${correlationId}] DB cache lookup notice:`, cacheErr.message);
        }

        const result = await this.executeOneShotPipeline({
          file: fileBuffer,
          filename,
          password,
          acceptance_policy: acceptance_policy || 'atLeastOneTransactionInRange',
          report_type: report_type || 'json',
          report_subtype: report_subtype || 'type3',
          clientRef,
          fileHash,
          userId: apiClient?.user_id || null,
          correlationId,
        });

        httpStatusCode = result.httpCode || 200;
        finalResponse = result.response;
        isSuccess = result.isSuccess;
        resultCode = result.resultCode;
      }
      // =========================================================================
      // MODE B: INDIVIDUAL WORKFLOW STEPS
      // =========================================================================
      else {
        switch (normalizedMethod) {
          case 'INITIATE_UPLOAD': {
            if (token && (file || request_id)) {
              // Step 2: Upload File (Multipart)
              const upstreamRes = await StatementAnalyzerClient.uploadFile({
                token,
                request_id: request_id || generatedRequestId,
                file,
                filename,
                password,
                acceptance_policy: acceptance_policy || 'atLeastOneTransactionInRange',
                correlationId,
              });

              if (!upstreamRes.ok) {
                const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to upload statement file to upstream.');
                finalResponse = mapped.response;
                httpStatusCode = mapped.httpCode;
                isSuccess = false;
                resultCode = 102;
              } else {
                finalResponse = upstreamRes.data || {
                  status: { code: 200, type: 'success', message: 'File uploaded successfully.' },
                  message: 'File uploaded successfully.',
                };
                httpStatusCode = 200;
                isSuccess = true;
              }
            } else {
              // Step 1: Initiate Session (JSON)
              const upstreamRes = await StatementAnalyzerClient.initiateUpload({
                acceptance_policy: acceptance_policy || 'atLeastOneTransactionInRange',
                client_ref_num: clientRef,
                correlationId,
              });

              if (!upstreamRes.ok) {
                const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to initiate statement upload session.');
                finalResponse = mapped.response;
                httpStatusCode = mapped.httpCode;
                isSuccess = false;
                resultCode = 102;
              } else {
                finalResponse = upstreamRes.data || {
                  status: { code: 200, type: 'success', message: 'Session initiated successfully.' },
                  message: 'Session initiated successfully.',
                };
                httpStatusCode = 200;
                isSuccess = true;
              }
            }
            break;
          }

          case 'COMPLETE_UPLOAD': {
            const upstreamRes = await StatementAnalyzerClient.completeUpload({
              request_id: request_id || generatedRequestId,
              correlationId,
            });

            if (!upstreamRes.ok) {
              const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to complete statement upload session.');
              finalResponse = mapped.response;
              httpStatusCode = mapped.httpCode;
              isSuccess = false;
              resultCode = 102;
            } else {
              finalResponse = upstreamRes.data || {
                status: { code: 200, type: 'success', message: 'Upload completed successfully.' },
                message: 'Upload completed successfully.',
              };
              httpStatusCode = 200;
              isSuccess = true;
            }
            break;
          }

          case 'CHECK_STATUS': {
            const targetReqId = request_id || generatedRequestId;

            // Check DB cache first
            try {
              const [dbRows] = await dbPool.query(
                `SELECT status, analysis_data, txn_id FROM bank_statement_analysis WHERE request_id = ? LIMIT 1`,
                [targetReqId]
              );
              if (dbRows && dbRows.length > 0 && dbRows[0].status === 'COMPLETED' && dbRows[0].analysis_data) {
                let parsed = dbRows[0].analysis_data;
                if (typeof parsed === 'string') {
                  try { parsed = JSON.parse(parsed); } catch (e) {}
                }
                finalResponse = parsed;
                httpStatusCode = 200;
                isSuccess = true;
                resultCode = 101;
                break;
              }
            } catch (dbErr) {
              console.warn('[StatementAnalyzer] DB status check warning:', dbErr.message);
            }

            const upstreamRes = await StatementAnalyzerClient.checkStatus({
              request_id: targetReqId,
              correlationId,
            });

            if (!upstreamRes.ok) {
              const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to check statement analysis status.');
              finalResponse = mapped.response;
              httpStatusCode = mapped.httpCode;
              isSuccess = false;
              resultCode = 102;
            } else {
              const statusData = upstreamRes.data;
              const rawStatus = String(
                statusData?.data?.status || statusData?.status?.type || statusData?.status || ''
              ).toLowerCase();
              const msg = String(statusData?.message || statusData?.status?.message || '').toLowerCase();

              if (rawStatus.includes('complete') || rawStatus.includes('success') || msg.includes('report prepared')) {
                const txnIdToRetrieve = statusData?.data?.txn_id || statusData?.txn_id || targetReqId;
                const retrieveRes = await StatementAnalyzerClient.retrieveStatement({
                  txn_id: txnIdToRetrieve,
                  report_type: report_type || 'json',
                  report_subtype: report_subtype || 'type3',
                  correlationId,
                });

                if (retrieveRes.ok && retrieveRes.data) {
                  try {
                    await dbPool.query(
                      `UPDATE bank_statement_analysis 
                       SET status = 'COMPLETED', txn_id = ?, analysis_data = ?, completed_at = NOW() 
                       WHERE request_id = ?`,
                      [String(txnIdToRetrieve), JSON.stringify(retrieveRes.data), targetReqId]
                    );
                  } catch (e) {}

                  finalResponse = retrieveRes.data;
                  httpStatusCode = 200;
                  isSuccess = true;
                  resultCode = 101;
                  break;
                }
              }

              finalResponse = statusData || {
                status: { code: 200, type: 'success', message: 'Status fetched.' },
                message: 'Status fetched.',
              };
              httpStatusCode = 200;
              isSuccess = true;
            }
            break;
          }

          case 'RETRIEVE_STATEMENT': {
            const targetTxnId = txn_id || request_id;

            // Check DB cache first
            if (targetTxnId) {
              try {
                const [dbRows] = await dbPool.query(
                  `SELECT status, analysis_data FROM bank_statement_analysis WHERE txn_id = ? OR request_id = ? LIMIT 1`,
                  [targetTxnId, targetTxnId]
                );
                if (dbRows && dbRows.length > 0 && dbRows[0].status === 'COMPLETED' && dbRows[0].analysis_data) {
                  let parsed = dbRows[0].analysis_data;
                  if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) {}
                  }
                  finalResponse = parsed;
                  httpStatusCode = 200;
                  isSuccess = true;
                  resultCode = 101;
                  break;
                }
              } catch (dbErr) {
                console.warn('[StatementAnalyzer] DB retrieve check warning:', dbErr.message);
              }
            }

            const upstreamRes = await StatementAnalyzerClient.retrieveStatement({
              txn_id,
              report_type: report_type || 'json',
              report_subtype: report_subtype || 'type3',
              correlationId,
            });

            if (!upstreamRes.ok) {
              const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to retrieve analyzed statement report.');
              finalResponse = mapped.response;
              httpStatusCode = mapped.httpCode;
              isSuccess = false;
              resultCode = 102;
            } else {
              // Return complete unmodified analytical response
              finalResponse = upstreamRes.data;
              httpStatusCode = 200;
              isSuccess = true;

              // Save to DB cache if txn_id is known
              if (targetTxnId && finalResponse) {
                try {
                  await dbPool.query(
                    `UPDATE bank_statement_analysis 
                     SET status = 'COMPLETED', analysis_data = ?, completed_at = NOW() 
                     WHERE txn_id = ? OR request_id = ?`,
                    [JSON.stringify(finalResponse), targetTxnId, targetTxnId]
                  );
                } catch (e) {}
              }
            }
            break;
          }

          case 'CANCEL_REQUEST': {
            const upstreamRes = await StatementAnalyzerClient.cancelRequest({
              request_id: request_id || generatedRequestId,
              correlationId,
            });

            if (!upstreamRes.ok) {
              const mapped = this.mapUpstreamError(upstreamRes.status, upstreamRes.data, 'Failed to cancel statement analysis request.');
              finalResponse = mapped.response;
              httpStatusCode = mapped.httpCode;
              isSuccess = false;
              resultCode = 102;
            } else {
              try {
                await dbPool.query(
                  `UPDATE bank_statement_analysis SET status = 'CANCELLED' WHERE request_id = ?`,
                  [request_id || generatedRequestId]
                );
              } catch (e) {}

              finalResponse = upstreamRes.data || {
                status: { code: 200, type: 'success', message: 'Request cancelled.' },
                message: 'Request cancelled.',
              };
              httpStatusCode = 200;
              isSuccess = true;
            }
            break;
          }

          default:
            throw ApiError.badRequest(`Unsupported workflow method '${method}'. Supported: INITIATE_UPLOAD, COMPLETE_UPLOAD, CHECK_STATUS, RETRIEVE_STATEMENT, CANCEL_REQUEST.`);
        }
      }
    } catch (err) {
      if (err.isLowBalance) {
        finalResponse = formatUpstreamLowBalanceResponse(generatedRequestId, clientRef);
        httpStatusCode = 502;
        isSuccess = false;
        resultCode = 102;
      } else if (err.isTimeout) {
        finalResponse = {
          status: {
            code: 504,
            type: 'error',
            message: 'Statement analysis upstream request timed out.',
          },
          message: 'Statement analysis upstream request timed out.',
          result_code: 102,
        };
        httpStatusCode = 504;
        isSuccess = false;
        resultCode = 102;
      } else if (err.statusCode) {
        throw err;
      } else {
        finalResponse = {
          status: {
            code: 502,
            type: 'error',
            message: 'Statement analysis service temporarily unavailable.',
          },
          message: 'Statement analysis service temporarily unavailable.',
          result_code: 102,
        };
        httpStatusCode = 502;
        isSuccess = false;
        resultCode = 102;
      }
    }

    const durationMs = Date.now() - startTime;

    // Asynchronously dispatch audit logging & wallet debit via BullMQ
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId: generatedRequestId,
        clientRefNum: clientRef,
        statusCode: httpStatusCode,
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

    return {
      httpCode: httpStatusCode,
      body: finalResponse,
    };
  }

  /**
   * Orchestrates the 1-Shot Automated Statement Analysis Pipeline:
   * 1. INITIATE_UPLOAD (JSON) ➔ 2. FILE UPLOAD (Multipart) ➔ 3. COMPLETE_UPLOAD (JSON) ➔ 4. BOUNDED POLLING (JSON) ➔ 5. RETRIEVE_STATEMENT (JSON)
   */
  static async executeOneShotPipeline({
    file,
    filename = 'statement.pdf',
    password,
    acceptance_policy,
    report_type,
    report_subtype,
    clientRef,
    fileHash,
    userId = null,
    correlationId = 'STA_1SHOT',
  }) {
    const maxPollAttempts = parseInt(process.env.STATEMENT_ANALYZER_MAX_POLL_ATTEMPTS || ENV.STATEMENT_ANALYZER?.MAX_POLL_ATTEMPTS || '80', 10);
    const pollIntervalMs = parseInt(process.env.STATEMENT_ANALYZER_POLL_INTERVAL_MS || ENV.STATEMENT_ANALYZER?.POLL_INTERVAL_MS || '2500', 10);
    const maxTimeoutMs = parseInt(process.env.STATEMENT_ANALYZER_TIMEOUT_MS || ENV.STATEMENT_ANALYZER?.TIMEOUT_MS || '300000', 10);
    const pipelineStartTime = Date.now();

    const policy = acceptance_policy || 'atLeastOneTransactionInRange';

    // 1. INITIATE_UPLOAD (JSON)
    const initRes = await StatementAnalyzerClient.initiateUpload({ acceptance_policy: policy, client_ref_num: clientRef, correlationId });
    const initData = initRes.data;

    const token = initData?.data?.token || initData?.token || initData?.result?.token || initData?.data?.session_token || initData?.session_token;
    const requestId = initData?.data?.request_id || initData?.request_id || initData?.result?.request_id || initData?.data?.requestId || initData?.requestId;
    const uploadUrl = initData?.data?.url || initData?.url;

    if (!initRes.ok || !token || !requestId) {
      console.log(`[StatementAnalyzer][${correlationId}] Step 1 Failed. Early termination.`);
      return this.mapUpstreamError(initRes.status, initData, 'Failed to initiate statement upload session.');
    }

    // Save initial processing entry into bank_statement_analysis
    try {
      await dbPool.query(
        `INSERT INTO bank_statement_analysis (user_id, source, file_name, file_hash, request_id, status) 
         VALUES (?, 'UPLOAD', ?, ?, ?, 'PROCESSING')`,
        [userId, filename, fileHash, String(requestId)]
      );
    } catch (insertErr) {
      console.warn(`[StatementAnalyzer][${correlationId}] DB insert record warning:`, insertErr.message);
    }

    // 2. FILE UPLOAD (Direct Digitap Upload with IDSPay Fallback)
    const uploadRes = await StatementAnalyzerClient.uploadFile({
      uploadUrl,
      token,
      request_id: requestId,
      file,
      filename,
      password,
      acceptance_policy: policy,
      correlationId,
    });

    if (!uploadRes.ok) {
      console.log(`[StatementAnalyzer][${correlationId}] Step 2 (Multipart Upload) Failed. Early termination.`);
      try {
        await dbPool.query(`UPDATE bank_statement_analysis SET status = 'FAILED' WHERE request_id = ?`, [String(requestId)]);
      } catch (e) {}
      return this.mapUpstreamError(uploadRes.status, uploadRes.data, 'Failed to upload statement file to upstream.');
    }

    // 3. COMPLETE_UPLOAD (JSON)
    const completeRes = await StatementAnalyzerClient.completeUpload({ request_id: requestId, correlationId });
    const completeData = completeRes.data;

    if (!completeRes.ok) {
      console.log(`[StatementAnalyzer][${correlationId}] Step 3 (Complete Upload) Failed. Early termination.`);
      try {
        await dbPool.query(`UPDATE bank_statement_analysis SET status = 'FAILED' WHERE request_id = ?`, [String(requestId)]);
      } catch (e) {}
      return this.mapUpstreamError(completeRes.status, completeData, 'Failed to complete statement upload session.');
    }

    let txnId = completeData?.data?.txn_id || completeData?.txn_id || initData?.data?.txn_id || requestId;

    // 4. BOUNDED STATUS POLLING (JSON) - Only CHECK_STATUS, no aggressive retrieval
    let isCompleted = false;
    let pollCount = 0;

    while (pollCount < maxPollAttempts && Date.now() - pipelineStartTime < maxTimeoutMs) {
      pollCount++;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      try {
        const statusRes = await StatementAnalyzerClient.checkStatus({ request_id: requestId, correlationId });
        const statusData = statusRes.data;
        const rawStatus = String(
          statusData?.data?.status || statusData?.status?.type || statusData?.status || ''
        ).toLowerCase();
        const msg = String(statusData?.message || statusData?.status?.message || '').toLowerCase();

        if (statusData?.data?.txn_id || statusData?.txn_id) {
          txnId = statusData?.data?.txn_id || statusData?.txn_id;
        }

        if (
          rawStatus.includes('complete') ||
          rawStatus.includes('success') ||
          msg.includes('report prepared') ||
          msg.includes('success')
        ) {
          isCompleted = true;
          break;
        }
      } catch (pollErr) {
        // Continue polling on transient network error
      }
    }

    // 5. RETRIEVE STATEMENT IF READY (JSON) - Exactly 1 retrieve hit once status confirms complete
    if (isCompleted) {
      const retrieveRes = await StatementAnalyzerClient.retrieveStatement({
        txn_id: txnId,
        report_type,
        report_subtype,
        correlationId,
      });

      if (retrieveRes.ok && retrieveRes.data) {
        // Cache complete analytical report in MySQL DB
        try {
          await dbPool.query(
            `UPDATE bank_statement_analysis 
             SET status = 'COMPLETED', txn_id = ?, analysis_data = ?, completed_at = NOW() 
             WHERE request_id = ?`,
            [String(txnId), JSON.stringify(retrieveRes.data), String(requestId)]
          );
        } catch (updateErr) {
          console.warn(`[StatementAnalyzer][${correlationId}] DB update record warning:`, updateErr.message);
        }

        // Return 100% unmodified upstream analytical JSON
        return {
          httpCode: 200,
          isSuccess: true,
          resultCode: 101,
          response: retrieveRes.data,
        };
      }

      console.log(`[StatementAnalyzer][${correlationId}] Step 5 (Retrieve) Failed. Early termination.`);
      return this.mapUpstreamError(retrieveRes.status, retrieveRes.data, 'Failed to retrieve analyzed statement report.');
    }

    // 6. ASYNC / PROCESSING STATUS (HTTP 202 Accepted)
    return {
      httpCode: 202,
      isSuccess: true,
      resultCode: 101,
      response: {
        status: {
          code: 202,
          type: 'processing',
          message: 'Statement analysis is still processing.',
        },
        message: 'Statement analysis is still processing.',
        data: {
          request_id: requestId,
          txn_id: txnId,
          status: 'PROCESSING',
          client_ref_num: clientRef,
        },
      },
    };
  }
}

export default StatementAnalyzerService;
