import { ItrCheckService } from './itrCheck.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const ItrCheckController = {
  /**
   * ITR Filing Verification Controller
   * Supported routes:
   * - POST /api/v1/verify/itr-check
   * - POST /verify/itr-check
   * - POST /api/v1/itr-check
   * - POST /itr-check
   */
  verifyItrCheck: asyncHandler(async (req, res) => {
    const pan =
      req.body?.pan ||
      req.body?.pan_number ||
      req.body?.panNumber ||
      req.query?.pan ||
      req.query?.pan_number ||
      req.body?.data?.pan ||
      '';

    const assessment_year =
      req.body?.assessment_year ||
      req.body?.ay ||
      req.body?.assessmentYear ||
      req.query?.assessment_year ||
      req.query?.ay ||
      null;

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/itr-check';

    const result = await ItrCheckService.verifyItrCheck({
      pan,
      assessment_year,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default ItrCheckController;
