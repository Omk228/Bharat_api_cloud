import { DthOperatorCheckService } from './dth.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const DthOperatorController = {
  /**
   * Check DTH Operator
   * Supported paths:
   * - POST /api/v1/verify/dth-operator
   * - POST /verify/dth-operator
   * - POST /api/v1/verify/dth-operator-check
   * - POST /verify/dth-operator-check
   * - POST /api/v1/dth/operator-check
   * - POST /dth/operator-check
   */
  checkDthOperator: asyncHandler(async (req, res) => {
    const dth_number =
      req.body?.dth_number ||
      req.body?.dthNumber ||
      req.body?.dth ||
      req.body?.subscriber_id ||
      req.body?.subscriberId ||
      req.body?.smart_card_number ||
      req.query?.dth_number ||
      req.query?.dthNumber ||
      req.query?.dth ||
      req.query?.subscriber_id ||
      req.body?.data?.dth_number ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      req.body?.clientRefNum ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/dth-operator';

    const result = await DthOperatorCheckService.checkDthOperator({
      dth_number,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default DthOperatorController;
