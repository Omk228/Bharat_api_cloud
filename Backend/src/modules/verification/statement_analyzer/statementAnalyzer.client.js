import { FormData as UndiciFormData } from 'undici';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import { isUpstreamLowBalance } from '../../../core/utils/upstreamHelper.js';

/**
 * Dedicated Upstream Client for Statement Analyzer PDF (Srv2)
 * Strictly isolates upstream HTTP communication, server-side credentials,
 * and step-specific transport models (JSON vs Multipart).
 */
export class StatementAnalyzerClient {
  /**
   * Resolve upstream credentials strictly from master IDSPay environment configuration
   */
  static async getUpstreamConfig() {
    const creds = await credentialResolver.getStatementAnalyzerCredentials();
    const cleanBaseUrl = (creds.baseUrl || 'https://javabackend.idspay.in/api/v1/prod').replace(/\/+$/, '');
    
    // Support primary IDSPay Statement Analyzer endpoint
    const endpoints = [
      `${cleanBaseUrl}/srv2/statement-analyzer`,
      `${cleanBaseUrl}/srv2/statement-upload`,
    ];

    const uniqueEndpoints = [...new Set(endpoints)];

    const credentialSets = [
      {
        apiId: creds.apiId,
        apiKey: creds.apiKey,
        tokenId: creds.tokenId,
      },
    ];

    return {
      endpoint: uniqueEndpoints[0],
      endpoints: uniqueEndpoints,
      credentialSets,
      apiId: creds.apiId,
      apiKey: creds.apiKey,
      tokenId: creds.tokenId,
    };
  }

  /**
   * Internal helper for Step 1, 3, 4, 5, 6 (JSON POST transport)
   */
  static async sendUpstreamJsonRequest(payload, timeoutMs = 120000, correlationId = 'STA_INTERNAL') {
    const { endpoints, credentialSets } = await this.getUpstreamConfig();

    let lastRes = null;
    let lastData = null;

    for (const cred of credentialSets) {
      if (!cred.apiId || !cred.apiKey || !cred.tokenId) continue;

      const fullPayload = {
        api_id: cred.apiId,
        api_key: cred.apiKey,
        token_id: cred.tokenId,
        ...payload,
      };

      for (const endpoint of endpoints) {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
        const startMs = Date.now();

        try {
          const response = await upstreamFetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fullPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutTimer);
          const latencyMs = Date.now() - startMs;
          const rawText = await response.text().catch(() => '');
          let data = null;
          try {
            data = JSON.parse(rawText);
          } catch (e) {
            data = {
              status: { code: response.status, type: response.ok ? 'success' : 'error', message: rawText || response.statusText },
              message: rawText || response.statusText,
            };
          }

          console.log(`[StatementAnalyzer][${correlationId}] Method: ${payload.method || 'UNKNOWN'} (${cred.apiId} @ ${endpoint}) -> HTTP ${response.status} (Latency: ${latencyMs}ms)${!response.ok ? ' Response: ' + rawText.substring(0, 200) : ''}`);

          if (response.ok) {
            return {
              status: response.status,
              ok: true,
              data,
            };
          }

          lastRes = response;
          lastData = data;

          if (isUpstreamLowBalance(data)) {
            const error = new Error('Upstream provider low balance.');
            error.isLowBalance = true;
            throw error;
          }

          // Continue trying fallback endpoint / credential sets on non-200
          continue;
        } catch (err) {
          clearTimeout(timeoutTimer);
          const latencyMs = Date.now() - startMs;
          console.log(`[StatementAnalyzer][${correlationId}] Method: ${payload.method || 'UNKNOWN'} (${cred.apiId} @ ${endpoint}) -> Error: ${err.message} (Latency: ${latencyMs}ms)`);

          if (err.isLowBalance) throw err;
          if (err.name === 'AbortError') {
            const timeoutErr = new Error(`Upstream request timed out after ${timeoutMs}ms`);
            timeoutErr.isTimeout = true;
            throw timeoutErr;
          }
        }
      }
    }

    return {
      status: lastRes?.status || 502,
      ok: false,
      data: lastData,
    };
  }

  /**
   * Step 1: INITIATE_UPLOAD (JSON transport)
   * Only forwards explicitly supported parameters: method, acceptance_policy
   */
  static async initiateUpload({ acceptance_policy = 'atLeastOneTransactionInRange', correlationId = 'STA_STEP1' } = {}) {
    const payload = {
      method: 'INITIATE_UPLOAD',
      acceptance_policy,
    };
    return this.sendUpstreamJsonRequest(payload, 90000, correlationId);
  }

  /**
   * Step 2: INITIATE_UPLOAD with File (Multipart transport)
   * Only forwards explicitly supported parameters: method, acceptance_policy, token, request_id, file, password
   */
  static async uploadFile({ uploadUrl, token, request_id, file, filename = 'statement.pdf', password, acceptance_policy = 'atLeastOneTransactionInRange', timeoutMs = 180000, correlationId = 'STA_STEP2' }) {
    if (!token) throw new Error('Session token is required for uploadFile.');
    if (!request_id) throw new Error('request_id is required for uploadFile.');
    if (!file) throw new Error('file binary buffer is required for uploadFile.');

    const { endpoints, credentialSets } = await this.getUpstreamConfig();
    const targetUrls = [];
    if (uploadUrl) targetUrls.push(uploadUrl);
    endpoints.forEach((ep) => {
      if (!targetUrls.includes(ep)) targetUrls.push(ep);
    });

    let lastRes = null;
    let lastData = null;

    for (const targetEndpoint of targetUrls) {
      const isDirectDigitap = targetEndpoint.includes('digitap.ai');
      const credLoop = isDirectDigitap ? [{ apiId: '', apiKey: '', tokenId: '' }] : credentialSets;

      for (const cred of credLoop) {
        if (!isDirectDigitap && (!cred.apiId || !cred.apiKey || !cred.tokenId)) continue;

        const formData = new UndiciFormData();
        if (!isDirectDigitap) {
          formData.append('api_id', cred.apiId);
          formData.append('api_key', cred.apiKey);
          formData.append('token_id', cred.tokenId);
          formData.append('method', 'UPLOAD');
          formData.append('acceptance_policy', acceptance_policy || 'atLeastOneTransactionInRange');
        }
        formData.append('token', token);
        formData.append('request_id', String(request_id));
        if (password) formData.append('password', password);

        // Native Undici File with accurate name & mime type
        const fileData = Buffer.isBuffer(file) ? file : (file instanceof Uint8Array ? file : Buffer.from(file));
        const pdfFile = typeof File !== 'undefined'
          ? new File([fileData], filename || 'statement.pdf', { type: 'application/pdf' })
          : new Blob([fileData], { type: 'application/pdf' });
        formData.append('file', pdfFile, filename || 'statement.pdf');

        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
        const startMs = Date.now();

        try {
          const response = await upstreamFetch(targetEndpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutTimer);
          const latencyMs = Date.now() - startMs;
          const rawText = await response.text().catch(() => '');
          let data = null;
          try {
            data = JSON.parse(rawText);
          } catch (e) {
            data = {
              status: { code: response.status, type: response.ok ? 'success' : 'error', message: rawText || response.statusText },
              message: rawText || response.statusText,
            };
          }

          console.log(`[StatementAnalyzer][${correlationId}] Step 2 (${isDirectDigitap ? 'DirectDigitap' : cred.apiId} @ ${targetEndpoint}) -> HTTP ${response.status} (Latency: ${latencyMs}ms)${!response.ok ? ' Response: ' + rawText.substring(0, 200) : ''}`);

          if (response.ok) {
            return {
              status: response.status,
              ok: true,
              data,
            };
          }

          lastRes = response;
          lastData = data;

          if (isUpstreamLowBalance(data)) {
            const error = new Error('Upstream provider low balance.');
            error.isLowBalance = true;
            throw error;
          }

          // Continue trying fallback endpoint / credential sets on non-200
          continue;
        } catch (err) {
          clearTimeout(timeoutTimer);
          const latencyMs = Date.now() - startMs;
          console.log(`[StatementAnalyzer][${correlationId}] Step 2 (${isDirectDigitap ? 'DirectDigitap' : cred.apiId} @ ${targetEndpoint}) -> Error: ${err.message} (Latency: ${latencyMs}ms)`);

          if (err.isLowBalance) throw err;
          if (err.name === 'AbortError') {
            const timeoutErr = new Error(`Upstream file upload timed out after ${timeoutMs}ms`);
            timeoutErr.isTimeout = true;
            throw timeoutErr;
          }
        }
      }
    }

    return {
      status: lastRes?.status || 502,
      ok: false,
      data: lastData,
    };
  }

  /**
   * Step 3: COMPLETE_UPLOAD (JSON transport)
   * Only forwards explicitly supported parameters: method, request_id
   */
  static async completeUpload({ request_id, correlationId = 'STA_STEP3' }) {
    if (!request_id) throw new Error('request_id is required for completeUpload.');

    const payload = {
      method: 'COMPLETE_UPLOAD',
      request_id,
    };
    return this.sendUpstreamJsonRequest(payload, 90000, correlationId);
  }

  /**
   * Step 4: CHECK_STATUS (JSON transport)
   * Only forwards explicitly supported parameters: method, request_id
   */
  static async checkStatus({ request_id, correlationId = 'STA_STEP4' }) {
    if (!request_id) throw new Error('request_id is required for checkStatus.');

    const payload = {
      method: 'CHECK_STATUS',
      request_id,
    };
    return this.sendUpstreamJsonRequest(payload, 90000, correlationId);
  }

  /**
   * Step 5: RETRIEVE_STATEMENT (JSON transport)
   * Only forwards explicitly supported parameters: method, txn_id, report_type, report_subtype
   */
  static async retrieveStatement({ txn_id, report_type = 'json', report_subtype = 'type3', correlationId = 'STA_STEP5' }) {
    if (!txn_id) throw new Error('txn_id is required for retrieveStatement.');

    const payload = {
      method: 'RETRIEVE_STATEMENT',
      txn_id,
      report_type,
      report_subtype,
    };
    return this.sendUpstreamJsonRequest(payload, 180000, correlationId);
  }

  /**
   * Step 6: CANCEL_REQUEST (JSON transport)
   * Only forwards explicitly supported parameters: method, request_id
   */
  static async cancelRequest({ request_id, correlationId = 'STA_STEP6' }) {
    if (!request_id) throw new Error('request_id is required for cancelRequest.');

    const payload = {
      method: 'CANCEL_REQUEST',
      request_id,
    };
    return this.sendUpstreamJsonRequest(payload, 90000, correlationId);
  }
}

export default StatementAnalyzerClient;
