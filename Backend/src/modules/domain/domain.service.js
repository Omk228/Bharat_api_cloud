import crypto from 'node:crypto';
import net from 'node:net';
import { ENV } from '../../core/config/env.config.js';
import CacheService from '../../core/cache/cache.service.js';
import QueueService from '../../core/queue/queue.service.js';
import { getApiPrice } from '../../core/config/pricing.config.js';
import { ApiError } from '../../core/utils/apiError.js';

const KNOWN_WHOIS_SERVERS = {
  in: 'whois.nixiregistry.in',
  'co.in': 'whois.nixiregistry.in',
  'net.in': 'whois.nixiregistry.in',
  'org.in': 'whois.nixiregistry.in',
  'gen.in': 'whois.nixiregistry.in',
  'ind.in': 'whois.nixiregistry.in',
  'firm.in': 'whois.nixiregistry.in',
  com: 'whois.verisign-grs.com',
  net: 'whois.verisign-grs.com',
  org: 'whois.publicinterestregistry.org',
  info: 'whois.afilias.net',
  biz: 'whois.nic.biz',
  io: 'whois.nic.io',
  co: 'whois.nic.co',
  ai: 'whois.nic.ai',
  app: 'whois.nic.google',
  dev: 'whois.nic.google',
  xyz: 'whois.nic.xyz',
  online: 'whois.nic.online',
  site: 'whois.nic.site',
  tech: 'whois.nic.tech',
  store: 'whois.nic.store',
  me: 'whois.nic.me',
  uk: 'whois.nic.uk',
  'co.uk': 'whois.nic.uk',
  us: 'whois.nic.us',
  ca: 'whois.cira.ca',
  de: 'whois.denic.de',
  fr: 'whois.nic.fr',
  eu: 'whois.eu',
  nl: 'whois.domain-registry.nl',
  ch: 'whois.nic.ch',
  ru: 'whois.tcinet.ru',
  jp: 'whois.jprs.jp',
  cn: 'whois.cnnic.cn',
  au: 'whois.auda.org.au',
  'com.au': 'whois.auda.org.au',
};

export class DomainService {
  /**
   * Sanitize domain string (remove protocol, www, trailing slashes/paths)
   */
  static cleanDomain(input) {
    if (!input || typeof input !== 'string') return '';
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    domain = domain.split(':')[0]; // remove port if present
    return domain.trim();
  }

  /**
   * Validate basic domain syntax
   */
  static isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') return false;
    const clean = this.cleanDomain(domain);
    // Standard domain regex: at least one label, dot, and TLD (min 2 chars)
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
    return domainRegex.test(clean);
  }

  /**
   * Query raw socket over port 43 (RFC 3912 WHOIS Protocol)
   */
  static queryWhoisSocket(server, query, timeoutMs = 7000) {
    return new Promise((resolve, reject) => {
      let raw = '';
      const socket = net.createConnection(43, server);
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.write(query + '\r\n');
      });

      socket.on('data', (chunk) => {
        raw += chunk.toString('utf8');
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(raw);
      });

      socket.on('end', () => resolve(raw));
      socket.on('error', (err) => reject(err));
    });
  }

  /**
   * Parse creation date and extract registrar metadata from raw WHOIS output
   */
  static extractCreationDate(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    const patterns = [
      /(?:Creation Date|Created On|created|Registration Time|Domain Name Commencement Date|Registered on|created_at):\s*([^\r\n]+)/i,
      /Record created on\s*([^\r\n]+)/i,
      /Created Date:\s*([^\r\n]+)/i,
      /registered:\s*([^\r\n]+)/i,
    ];

    for (const regex of patterns) {
      const match = rawText.match(regex);
      if (match && match[1]) {
        const trimmed = match[1].trim();
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Directly fetch live registration data from authoritative TLD Registry
   */
  static async fetchWhoisRegistration(domain) {
    const parts = domain.toLowerCase().split('.');
    const tld2 = parts.length > 2 ? parts.slice(-2).join('.') : null;
    const tld1 = parts[parts.length - 1];

    let server = (tld2 && KNOWN_WHOIS_SERVERS[tld2]) || KNOWN_WHOIS_SERVERS[tld1];

    if (!server) {
      try {
        const iana = await this.queryWhoisSocket('whois.iana.org', tld1, 4000);
        const m = iana.match(/whois:\s+([^\s]+)/i);
        if (m) server = m[1];
      } catch (err) {
        console.warn(`⚠️ [IANA LOOKUP] Failed to discover server for .${tld1}:`, err.message);
      }
    }

    if (!server) server = 'whois.iana.org';

    const raw = await this.queryWhoisSocket(server, domain, 7000);
    const creationDate = this.extractCreationDate(raw);

    if (!creationDate) {
      throw new Error(`Creation date not available in registry response from ${server}`);
    }

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - creationDate.getTime());
    const age_days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const age_years = parseFloat((age_days / 365.25).toFixed(1));

    // Format ISO string to YYYY-MM-DDTHH:mm:ss+00:00
    const isoString = creationDate.toISOString().split('.')[0] + '+00:00';

    return {
      domain,
      creation_date: isoString,
      age_days,
      age_years,
      _registry_server: server,
    };
  }

  /**
   * Get Domain Age with 24-Hour Smart Caching & Asynchronous Queue Logging
   * Seamlessly falls back to direct authoritative registry WHOIS if upstream quota is exhausted
   */
  static async getDomainAge({ domain, client_ref_num, apiClient }) {
    const startedAt = Date.now();
    const clean = this.cleanDomain(domain);
    const requestId = crypto.randomUUID();
    const clientRef = client_ref_num || `DOM_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const endpoint = '/dosvak/domain-age';
    const hitCost = getApiPrice(endpoint);

    if (!clean) {
      throw ApiError.badRequest('Missing required parameter: domain is mandatory (e.g. example.com)');
    }

    if (!this.isValidDomain(clean)) {
      throw ApiError.badRequest(`Invalid domain format: "${domain}". Expected standard domain like "example.com" or "google.com".`);
    }

    // Pre-flight wallet balance check if authenticated
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(`Insufficient wallet balance (₹${hitCost.toFixed(2)} required). Please recharge your wallet.`);
    }

    // 1. Check Smart Result Cache (24 hours retention, sub-millisecond retrieval)
    // Ignore legacy simulated fallback cache
    const cachedResult = await CacheService.getVerification('domain_age', clean);
    if (cachedResult && !cachedResult._simulated && cachedResult.creation_date !== '2015-01-01T00:00:00+00:00') {
      const durationMs = Date.now() - startedAt;
      console.log(`⚡ [DOMAIN AGE CACHE HIT] Returned in ${durationMs}ms: domain=${clean}`);

      const { provider, _cached, _simulated, _registry_server, ...cleanCached } = cachedResult;
      const cachedResponse = {
        ...cleanCached,
        status: 'success',
        status_message: 'completed',
        request_id: cleanCached.request_id || requestId,
        client_ref_num: clientRef,
      };
      delete cachedResponse.provider;
      if (cachedResponse.data) {
        delete cachedResponse.data.provider;
      }

      // Asynchronously record audit job to queue
      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'GET',
          requestId: cachedResponse.request_id,
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

      return cachedResponse;
    }

    // 2. Fetch Live Domain Data (ApyHub Primary -> Authoritative Direct WHOIS Fallback)
    let domainData = null;
    let providerSource = 'ApyHub';

    const upstreamBase = ENV.APYHUB?.BASE_URL;
    const apiToken = ENV.APYHUB?.API_TOKEN;

    if (upstreamBase && apiToken) {
      const upstreamUrl = `${upstreamBase}/dosvak/domain-age?domain=${encodeURIComponent(clean)}`;
      console.log(`📡 [DOMAIN AGE PROXY] Attempting ApyHub: ${clean}`);

      try {
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            'apy-token': apiToken,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (upstreamRes.ok) {
          const apyData = await upstreamRes.json();
          if (apyData && (apyData.creation_date || apyData.age_days != null)) {
            domainData = {
              domain: apyData.domain || clean,
              creation_date: apyData.creation_date,
              age_days: apyData.age_days,
              age_years: apyData.age_years,
            };
            providerSource = 'ApyHub';
          }
        } else {
          console.warn(`⚠️ [APYHUB NOTICE] Status ${upstreamRes.status} for ${clean}. Triggering authoritative WHOIS resolver.`);
        }
      } catch (err) {
        console.warn(`⚠️ [APYHUB ERROR] ${err.message}. Triggering authoritative WHOIS resolver.`);
      }
    }

    // Fallback directly to Authoritative Registry WHOIS lookup if ApyHub was rate limited or failed
    if (!domainData) {
      console.log(`🌐 [AUTHORITATIVE WHOIS] Querying live registry for: ${clean}`);
      try {
        domainData = await this.fetchWhoisRegistration(clean);
        providerSource = 'Registry WHOIS';
      } catch (whoisErr) {
        console.error(`❌ [WHOIS LOOKUP ERROR] Could not resolve ${clean}:`, whoisErr.message);
      }
    }

    const durationMs = Date.now() - startedAt;

    // 3. Handle Successful Resolution
    if (domainData && domainData.creation_date) {
      const successResponse = {
        status: 'success',
        status_message: 'completed',
        http_response_code: 200,
        result_code: 101,
        request_id: requestId,
        client_ref_num: clientRef,
        message: 'Domain age retrieved successfully',
        data: {
          domain: domainData.domain || clean,
          creation_date: domainData.creation_date,
          age_days: domainData.age_days,
          age_years: domainData.age_years,
        },
        domain: domainData.domain || clean,
        creation_date: domainData.creation_date,
        age_days: domainData.age_days,
        age_years: domainData.age_years,
      };

      // Store in smart cache for 24 hours
      await CacheService.setVerification('domain_age', clean, successResponse, 86400).catch(() => {});

      // Asynchronously push to BullMQ queue without blocking
      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'GET',
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

      return successResponse;
    }

    // 4. Handle Domain Not Found
    const errorResponse = {
      status: 'error',
      status_message: 'failed',
      http_response_code: 404,
      result_code: 102,
      request_id: requestId,
      client_ref_num: clientRef,
      message: `Domain registration records not found or domain "${clean}" does not exist. Please check the domain name.`,
      data: null,
    };

    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'GET',
        requestId,
        clientRefNum: clientRef,
        statusCode: errorResponse.http_response_code,
        resultCode: 102,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: 0,
        environment: apiClient.environment,
        isSuccess: false,
      }).catch(() => {});
    }

    return errorResponse;
  }
}

export default DomainService;

