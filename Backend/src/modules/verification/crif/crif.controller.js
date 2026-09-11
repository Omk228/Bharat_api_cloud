import { CrifVerificationService } from './crif.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';
import { ENV } from '../../../core/config/env.config.js';

export const CrifController = {
  /**
   * CRIF High Mark Credit Score V4 Controller
   * Endpoint: POST /crif/Credit-ScoreV4
   */
  verifyCrifScore: asyncHandler(async (req, res) => {
    const {
      mobile_no,
      first_name,
      last_name,
      name_lookup,
    } = req.body || {};

    const baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com';

    const result = await CrifVerificationService.verifyCrifScoreV4({
      mobile_no,
      first_name,
      last_name,
      name_lookup,
      apiClient: req.apiClient,
      baseUrl,
    });

    return res.status(200).json(result);
  }),
};

export default CrifController;
