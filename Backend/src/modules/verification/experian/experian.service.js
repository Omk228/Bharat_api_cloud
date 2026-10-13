import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import crypto from 'node:crypto';
import { ENV } from '../../../core/config/env.config.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';
import { renderExperianReportHtml, renderExperianErrorHtml } from './renderer/experianHtmlRenderer.js';


// In-memory fallback map for high-speed report/PDF token retrieval
const localReportStore = new Map();

export class ExperianVerificationService {
  /**
   * Validate 10-digit Indian Mobile Number
   */
  static isValidMobileNumber(mobile) {
    if (!mobile || typeof mobile !== 'string') return false;
    const clean = mobile.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  }

  /**
   * Validate 10-character PAN
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim());
  }

  /**
   * Store report in cache and in-memory fallback
   */
  static async saveReport(token, reportData) {
    localReportStore.set(token, { data: reportData, expiresAt: Date.now() + 86400000 });
    try {
      await CacheService.setVerification('experian_rep', token, reportData, 86400);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Retrieve report by token
   */
  static async getReport(token) {
    const mem = localReportStore.get(token);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }
    try {
      const cached = await CacheService.getVerification('experian_rep', token);
      if (cached) return cached;
    } catch (e) {
      // ignore
    }
    return mem?.data || null;
  }

  /**
   * Experian Credit Report Verification (/srv2/credit-report/experian)
   */
  static async verifyExperianScore({
    mobile_no,
    pan,
    first_name,
    last_name,
    dob,
    client_ref_num,
    apiClient,
    baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com',
  }) {
    const startTime = Date.now();
    const cleanMobile = String(mobile_no || '').trim().replace(/\D/g, '');
    const cleanPan = String(pan || '').trim().toUpperCase();
    const cleanFirstName = String(first_name || '').trim();
    const cleanLastName = String(last_name || '').trim();
    const cleanDob = String(dob || '').trim();

    if (!cleanMobile || !this.isValidMobileNumber(cleanMobile)) {
      throw ApiError.badRequest('Valid 10-digit mobile_no is required');
    }
    if (!cleanPan || !this.isValidPan(cleanPan)) {
      throw ApiError.badRequest('Valid 10-character pan is required');
    }
    if (!cleanFirstName) {
      throw ApiError.badRequest('first_name is required');
    }
    if (!cleanLastName) {
      throw ApiError.badRequest('last_name is required');
    }
    if (!cleanDob) {
      throw ApiError.badRequest('dob (Date of Birth) is required (e.g. 2000-02-20)');
    }

    const endpoint = '/srv2/credit-report/experian';
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);
    const clientRef = client_ref_num || `EXP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const requestId = crypto.randomUUID();

    // Pre-flight wallet balance check
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    const cacheKey = `${cleanPan}_${cleanMobile}`;
    const cachedData = await this.getReport(cacheKey);
    if (cachedData) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [EXPERIAN CACHE HIT] Returned from Cache in ${durationMs}ms: PAN=${cleanPan}`);

      // Async audit log
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
          environment: apiClient.environment,
          isSuccess: true,
        }).catch(() => {});
      }

      return {
        ...cachedData,
        request_id: requestId,
        client_ref_num: clientRef,
        _cached: true,
      };
    }

    // Resolve upstream credentials
    const idspayCreds = await credentialResolver.getIdspayCredentials();
    const masterApiId = idspayCreds.apiId;
    const masterApiKey = idspayCreds.apiKey;
    const masterTokenId = idspayCreds.tokenId;
    const upstreamUrl = `${idspayCreds.baseUrl}/srv2/credit-report/experian`;

    let upstreamResult = null;
    let isSuccess = false;
    let upstreamErrorMsg = null;

    if (masterApiId && masterApiKey && masterTokenId) {
      try {
        console.log(`📡 [PROXY GATEWAY] Forwarding Experian Credit Report request to: ${upstreamUrl}`);
        console.log(`🔑 Master Creds: API_ID=${masterApiId}, PAN=${cleanPan.slice(0, 5)}XXXX${cleanPan.slice(-1)}, Mobile=${cleanMobile.slice(0, 3)}XXXX${cleanMobile.slice(-3)}`);

        const upstreamRes = await upstreamFetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_id: masterApiId,
            api_key: masterApiKey,
            token_id: masterTokenId,
            mobile_no: cleanMobile,
            pan: cleanPan,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            dob: cleanDob,
          }),
        });

        console.log(`⏱️ [EXPERIAN UPSTREAM LATENCY]: ${upstreamRes.upstreamLatencyMs}ms`);
        const rawText = await upstreamRes.text();
        let data = null;
        try {
          data = JSON.parse(rawText);
          console.log(`📥 [EXPERIAN UPSTREAM RESPONSE] Status ${upstreamRes.status}`);
        } catch (parseErr) {
          console.error(`⚠️ [EXPERIAN UPSTREAM NON-JSON] Status ${upstreamRes.status}:`, rawText);
        }

        if (data && isUpstreamLowBalance(data)) {
          console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during Experian verification.');
          return formatUpstreamLowBalanceResponse(requestId, clientRef);
        }

        const isUpstreamOk = Boolean(
          data && (
            data.status?.code === 200 ||
            data.status === 200 ||
            data.status === true ||
            data.status === 'success' ||
            data.statusCode === 200 ||
            data.http_response_code === 200 ||
            data.result_code === 101 ||
            data.result_code === 200 ||
            data.success === true ||
            data.data?.result_json ||
            data.data?.credit_report_message ||
            data.data?.pdf_url
          )
        );

        if (isUpstreamOk) {
          upstreamResult = data;
          isSuccess = true;
        } else if (data) {
          upstreamErrorMsg = data.message || data.status?.message || data.status_message || null;
        }
      } catch (err) {
        console.error('❌ [EXPERIAN UPSTREAM ERROR]:', err.message);
        upstreamErrorMsg = err.message;
      }
    }

    const durationMs = Date.now() - startTime;

    if (!isSuccess || !upstreamResult) {
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
          environment: apiClient.environment,
          isSuccess: false,
        }).catch(() => {});
      }

      throw ApiError.badRequest(upstreamErrorMsg || 'Failed to fetch Experian credit report. Please check details and try again.');
    }

    // Sanitize & White-label response
    let finalData = upstreamResult.data || {};

    // Transform upstream pdf_url to Bharat API custom endpoint
    if (finalData.pdf_url) {
      try {
        const rawPdfUrl = finalData.pdf_url;
        let refParam = '';
        let typeParam = 'SVC0039';

        if (rawPdfUrl.includes('?')) {
          const queryPart = rawPdfUrl.split('?')[1];
          const searchParams = new URLSearchParams(queryPart);
          refParam = searchParams.get('reference') || '';
          typeParam = searchParams.get('type') || 'SVC0039';
        }

        if (refParam) {
          finalData.pdf_url = `${baseUrl}/api/v1/credit-report/experian/pdf?reference=${encodeURIComponent(refParam)}&type=${encodeURIComponent(typeParam)}`;
        }
      } catch (urlErr) {
        console.warn('⚠️ [EXPERIAN PDF URL PARSE ERROR]:', urlErr.message);
      }
    }

    const sanitizedResponse = {
      status: {
        code: 200,
        type: 'success',
        message: 'Credit score request processed successfully.',
      },
      message: 'Credit score request processed successfully.',
      data: finalData,
      request_id: requestId,
      client_ref_num: clientRef,
    };

    // Save to cache for future fast lookup
    await this.saveReport(cacheKey, sanitizedResponse);
    if (finalData.pdf_url) {
      try {
        const parsedUrl = new URL(finalData.pdf_url);
        const ref = parsedUrl.searchParams.get('reference');
        if (ref) {
          await this.saveReport(ref, finalData.result_json || finalData);
        }
      } catch (_) {}
    }

    // Asynchronously log successful hit to BullMQ
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
        environment: apiClient.environment,
        isSuccess: true,
      }).catch(() => {});
    }

    return sanitizedResponse;
  }

  /**
   * Serve Sanitized JS Bundle with 100% Bharat API Cloud Branding
   * Replaces upstream logo, brand strings, and matches all endpoint routes to Rd viewer
   */
  static async serveProxyBundle(res) {
    try {
      let cachedJs = await CacheService.get('experian:sanitized_js_bundle_v2');
      if (!cachedJs) {
        console.log('📡 [PROXY BUNDLE] Fetching and sanitizing upstream JS bundle...');
        const upstreamRes = await upstreamFetch('https://apiuser.idspay.in/static/js/main.721cab39.js');
        let js = await upstreamRes.text();

        // 1. Ensure wildcard route matching so Rd component mounts on any endpoint URL
        const oldRoute = 'path:"/credit-report-pdf",element:(0,Fe.jsx)(Rd,{})';
        const newRoute = 'path:"*",element:(0,Fe.jsx)(Rd,{})';
        js = js.split(oldRoute).join(newRoute);

        // 2. Replace IDSPay circular logo with Bharat API Cloud Shield SVG
        const shieldSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3Cpath d='M9 12l2 2 4-4'/%3E%3C/svg%3E";
        js = js.split('/media/logo/idspay_circle_white.png').join(shieldSvg);
        js = js.split('/media/logo/idspay_horizontal_blue.png').join(shieldSvg);
        js = js.split('/media/logo/idspay_horizontal_white.png').join(shieldSvg);
        js = js.split('assets/images/IDSPayLogo.png').join(shieldSvg);
        js = js.split('assets/images/infocargroup logo.png').join(shieldSvg);
        js = js.split('IDSPay API User Login').join('Experian Credit Report — Bharat API Cloud');
        js = js.split('IDSPay').join('Bharat API Cloud');

        cachedJs = js;
        await CacheService.set('experian:sanitized_js_bundle_v2', js, 86400).catch(() => {});
      }

      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cachedJs);
    } catch (err) {
      console.error('❌ [PROXY BUNDLE ERROR]:', err.message);
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.status(500).send('console.error("Failed to load script");');
    }
  }

  /**
   * Serve 100% White-labeled Experian Credit Report HTML
   * Native SPA render with zero iframe and zero upstream loader branding
   */
  static async streamExperianPdf({ reference, type = 'SVC0039', res }) {
    if (!reference) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Reference — Bharat API Cloud</title></head>
        <body style="background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h2>Missing Report Reference</h2>
            <p style="color:#94a3b8;">Report reference query parameter is required.</p>
          </div>
        </body>
        </html>
      `);
    }

    const cleanRef = String(reference).trim();
    const cleanType = String(type || 'SVC0039').trim();
    const targetUrl = `https://apiuser.idspay.in/credit-report-pdf?reference=${encodeURIComponent(cleanRef)}&type=${encodeURIComponent(cleanType)}`;

    try {
      const upstreamRes = await upstreamFetch(targetUrl);
      let html = await upstreamRes.text();

      // Rewrite static assets so the exact upstream React SPA runs natively on our endpoint
      html = html.replace('/static/css/main.c3d69d3d.css', 'https://apiuser.idspay.in/static/css/main.c3d69d3d.css');
      html = html.replace('/static/js/main.721cab39.js', '/api/v1/credit-report/experian/proxy-bundle.js');
      html = html.replace(/<link rel="manifest"[^>]*>/gi, '');
      html = html.replaceAll('<title>IDSPay API User Login</title>', '<title>Experian Credit Report — Bharat API Cloud</title>');
      html = html.replaceAll('IDSPay', 'Bharat API Cloud');

      // Inject custom styling to ensure any fallback image logo displays the Bharat API Cloud shield
      const injectedStyle = `
<style>
  img[src*="idspay"], img[alt="logo"] {
    content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3Cpath d='M9 12l2 2 4-4'/%3E%3C/svg%3E") !important;
  }
</style>`;
      html = html.replace('</head>', `${injectedStyle}</head>`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(html);
    } catch (err) {
      console.error('❌ [EXPERIAN PROXY ERROR]:', err.message);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send('<h3>Failed to load credit report. Please try again.</h3>');
    }
  }
}
