import { WorkEmailVerificationService } from './workEmail.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const WorkEmailController = {
  /**
   * Verify Work / Corporate Email Address
   * Supported paths:
   * - POST /api/v1/verify/work-email
   * - POST /verify/work-email
   * - POST /api/v1/work-email/verify
   * - POST /corporate-email/verify
   */
  verifyWorkEmail: asyncHandler(async (req, res) => {
    const email =
      req.body?.email ||
      req.body?.work_email ||
      req.body?.corporate_email ||
      req.body?.corp_email ||
      req.query?.email ||
      req.query?.work_email ||
      req.query?.corporate_email ||
      req.body?.data?.email ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/work-email';

    const result = await WorkEmailVerificationService.verifyWorkEmail({
      email,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default WorkEmailController;
