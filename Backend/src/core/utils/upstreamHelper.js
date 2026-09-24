/**
 * Upstream Provider Helper
 * Detects upstream provider low balance / credit exhaustion errors and formats sanitized unexpected issue responses.
 */

/**
 * Checks whether an upstream response or error indicates that the upstream provider has low balance / exhausted credits.
 * @param {any} dataOrError - The upstream response object, string, or error.
 * @returns {boolean}
 */
export function isUpstreamLowBalance(dataOrError) {
  if (!dataOrError) return false;

  const targetStr = typeof dataOrError === 'string'
    ? dataOrError
    : JSON.stringify(dataOrError);

  return (
    /low[\s_-]*balance/i.test(targetStr) ||
    /insufficient[\s_-]*(wallet[\s_-]*)?(balance|fund|funds|credit|credits|quota)/i.test(targetStr) ||
    /wallet[\s_-]*balance[\s_-]*(is[\s_-]*)?(low|exhausted|empty|zero)/i.test(targetStr) ||
    /(credits?|balance|funds?)[\s_-]*exhausted/i.test(targetStr) ||
    /exhausted[\s_-]*(credits?|balance|funds?)/i.test(targetStr) ||
    /out[\s_-]*of[\s_-]*(balance|credits?|fund|funds?)/i.test(targetStr) ||
    /not[\s_-]*enough[\s_-]*(balance|credit|credits)/i.test(targetStr) ||
    /recharge[\s_-]*(your[\s_-]*)?(wallet|account)/i.test(targetStr) ||
    /quota[\s_-]*exceeded/i.test(targetStr) ||
    /credit[\s_-]*limit[\s_-]*exceeded/i.test(targetStr) ||
    /upstream[\s_-]*balance/i.test(targetStr)
  );
}

/**
 * Formats a standardized unexpected issue response for the client when upstream provider has low balance.
 * @param {string} [requestId] - Request identifier
 * @param {string} [clientRef] - Client reference number
 * @returns {object}
 */
export function formatUpstreamLowBalanceResponse(requestId = '', clientRef = '') {
  return {
    status: {
      code: 500,
      type: 'failed',
      message: 'Server Error',
    },
    http_response_code: 500,
    result_code: 102,
    request_id: requestId || `req_${Date.now()}`,
    client_ref_num: clientRef || null,
    message: 'Server Error. Please try again later.',
    status_message: 'Server Error',
    result: null,
    data: null,
  };
}

export default {
  isUpstreamLowBalance,
  formatUpstreamLowBalanceResponse
};
