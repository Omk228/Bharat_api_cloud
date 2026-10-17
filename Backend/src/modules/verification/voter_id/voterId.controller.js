import { VoterIdService } from './voterId.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const VoterIdController = {
  /**
   * Verify Voter ID (EPIC) details
   * Supported routes:
   * - POST /api/v1/verify/voter-id
   * - POST /verify/voter-id
   * - POST /api/v1/voter-id
   * - POST /voter-id
   */
  verifyVoterId: asyncHandler(async (req, res) => {
    const epic_no =
      req.body?.epic_no ||
      req.body?.epicNo ||
      req.body?.epic_number ||
      req.body?.epicNumber ||
      req.body?.voter_id ||
      req.body?.voterId ||
      req.body?.id_number ||
      req.body?.number ||
      req.query?.epic_no ||
      req.query?.epic_number ||
      req.query?.voter_id ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/voter-id';

    const result = await VoterIdService.verifyVoterId({
      epic_no,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || (result.success ? 200 : 400);
    return res.status(httpCode).json(result);
  }),
};

export default VoterIdController;
