import { ExperianVerificationService } from './experian.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';
import { ENV } from '../../../core/config/env.config.js';

export const ExperianController = {
  /**
   * Experian Credit Report Controller
   * Endpoint: POST /srv2/credit-report/experian & POST /api/v1/srv2/credit-report/experian
   */
  verifyExperianCreditReport: asyncHandler(async (req, res) => {
    const {
      mobile_no,
      pan,
      first_name,
      last_name,
      dob,
      client_ref_num,
    } = req.body || {};

    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const baseUrl = host ? `${protocol}://${host}` : (ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com');

    const result = await ExperianVerificationService.verifyExperianScore({
      mobile_no,
      pan,
      first_name,
      last_name,
      dob,
      client_ref_num,
      apiClient: req.apiClient,
      baseUrl,
    });

    return res.status(200).json(result);
  }),

  /**
   * Serve / Stream White-labeled Experian PDF Report
   * Endpoint: GET /api/v1/credit-report/experian/pdf and GET /srv2/credit-report/experian/pdf
   */
  getExperianPdf: asyncHandler(async (req, res) => {
    const reference = req.query.reference || req.query.ref || req.params.reference || '';
    const type = req.query.type || 'SVC0039';

    return await ExperianVerificationService.streamExperianPdf({
      reference,
      type,
      res,
    });
  }),

  /**
   * Serve Sanitized Experian JS Bundle with 100% White-labeling
   */
  getProxyBundle: asyncHandler(async (req, res) => {
    return await ExperianVerificationService.serveProxyBundle(res);
  }),
};

export default ExperianController;
