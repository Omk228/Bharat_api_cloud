import { TanToCompanyService } from './tanToCompany.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const TanToCompanyController = {
  /**
   * Lookup company / deductor details from TAN
   * Supported routes:
   * - POST /api/v1/verify/tan-to-company
   * - POST /verify/tan-to-company
   * - POST /api/v1/tan-to-company
   * - POST /tan-to-company
   */
  verifyTanToCompany: asyncHandler(async (req, res) => {
    const tan =
      req.body?.tan ||
      req.body?.tan_number ||
      req.body?.tanNumber ||
      req.body?.number ||
      req.query?.tan ||
      req.query?.tan_number ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/tan-to-company';

    const result = await TanToCompanyService.verifyTanToCompany({
      tan,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default TanToCompanyController;
