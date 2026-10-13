import { MobileIntelligenceService } from './mobileIntelligence.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const MobileIntelligenceController = {
  /**
   * Search Mobile Intelligence (WhoCalled)
   * Supported routes:
   * - POST /api/v1/verify/mobile-intelligence
   * - POST /verify/mobile-intelligence
   * - GET /api/v1/verify/mobile-intelligence
   * - POST /srv2/mobile-intelligence
   */
  searchMobileIntelligence: asyncHandler(async (req, res) => {
    const phone =
      req.body?.phone ||
      req.body?.mobile ||
      req.body?.phoneNumber ||
      req.body?.mobile_number ||
      req.body?.query ||
      req.query?.phone ||
      req.query?.mobile ||
      req.query?.query ||
      req.body?.data?.phone ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/mobile-intelligence';

    const result = await MobileIntelligenceService.searchMobileIntelligence({
      phone,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default MobileIntelligenceController;
