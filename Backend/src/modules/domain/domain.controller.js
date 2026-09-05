import DomainService from './domain.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

export class DomainController {
  /**
   * Handle Domain Age Verification (GET & POST)
   * Supports:
   *  GET  /dosvak/domain-age?domain=example.com
   *  POST /dosvak/domain-age (body: { domain: "example.com" })
   */
  static getDomainAge = asyncHandler(async (req, res) => {
    const domain =
      req.query?.domain ||
      req.body?.domain ||
      req.params?.domain ||
      req.body?.domain_name ||
      req.query?.domain_name;

    const client_ref_num =
      req.query?.client_ref_num ||
      req.body?.client_ref_num ||
      req.headers['x-client-ref-num'];

    const result = await DomainService.getDomainAge({
      domain,
      client_ref_num,
      apiClient: req.apiClient,
    });

    const statusCode = result.http_response_code || 200;
    return res.status(statusCode).json(result);
  });
}

export default DomainController;
