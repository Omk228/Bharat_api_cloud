import { MobileOperatorCheckService } from './operator.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const MobileOperatorController = {
  /**
   * Check Mobile Operator, Circle, and Type
   * Supported paths:
   * - POST /api/v1/verify/operator-circle
   * - POST /verify/operator-circle
   * - POST /api/v1/verify/mobile-operator
   * - POST /verify/mobile-operator
   * - POST /api/v1/operator-circle/check
   * - POST /operator-circle/check
   * - POST /api/v1/mobile-operator/check
   * - POST /mobile-operator/check
   */
  checkMobileOperator: asyncHandler(async (req, res) => {
    const mobile_number =
      req.body?.mobile_number ||
      req.body?.mobileNumber ||
      req.body?.mobile ||
      req.body?.phone ||
      req.query?.mobile_number ||
      req.query?.mobileNumber ||
      req.query?.mobile ||
      req.query?.phone ||
      req.body?.data?.mobile_number ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      req.body?.clientRefNum ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/operator-circle';

    const result = await MobileOperatorCheckService.checkMobileOperator({
      mobile_number,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default MobileOperatorController;
