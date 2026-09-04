import { Agent, fetch as undiciFetch } from 'undici';

/**
 * High-performance persistent HTTP Keep-Alive Agent
 * Eliminates TCP 3-way handshake and SSL/TLS negotiation overhead on repeated upstream calls.
 */
export const upstreamAgent = new Agent({
  // Keep idle sockets open for 60 seconds
  keepAliveTimeout: 60_000,
  // Max lifespan of a socket connection (10 minutes)
  keepAliveMaxTimeout: 600_000,
  // Max concurrent TCP connections per upstream origin
  connections: 50,
  // Pipelining factor
  pipelining: 1,
  // Socket connect configuration (30 seconds for slow upstream government portals)
  connect: {
    timeout: 30_000,
    keepAlive: true,
    keepAliveInitialDelay: 30_000
  },
  headersTimeout: 30_000,
  bodyTimeout: 30_000
});

/**
 * Execute an upstream HTTP request using the persistent connection pool
 * @param {string} url - Target upstream URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>}
 */
export async function upstreamFetch(url, options = {}) {
  const startedAt = Date.now();
  
  const response = await undiciFetch(url, {
    ...options,
    dispatcher: upstreamAgent,
    headers: {
      'Connection': 'keep-alive',
      ...(options.headers || {})
    }
  });

  const durationMs = Date.now() - startedAt;
  response.upstreamLatencyMs = durationMs;

  return response;
}

export default {
  upstreamAgent,
  upstreamFetch
};
