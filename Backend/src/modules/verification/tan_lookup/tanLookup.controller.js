import { TanLookupService } from './tanLookup.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const TanLookupController = {
  /**
   * Search and verify Tax Deduction Account Number (TAN) by company name
   * Supported routes:
   * - POST /api/v1/verify/tan-lookup
   * - POST /verify/tan-lookup
   * - POST /api/v1/tan-lookup
   * - POST /tan-lookup
   */
  lookupTan: asyncHandler(async (req, res) => {
    const company_name =
      req.body?.company_name ||
      req.body?.companyName ||
      req.body?.name ||
      req.body?.entity_name ||
      req.query?.company_name ||
      req.query?.name ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/tan-lookup';

    const result = await TanLookupService.lookupTan({
      company_name,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default TanLookupController;
