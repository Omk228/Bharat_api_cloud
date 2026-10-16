import { GstAuthenticatedAdvanceService } from './gstAuthenticatedAdvance.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const GstAuthenticatedAdvanceController = {
  verify: asyncHandler(async (req, res) => {
    const gstin =
      req.body?.gstin ||
      req.body?.gstin_number ||
      req.query?.gstin ||
      req.body?.data?.gstin ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const data = await GstAuthenticatedAdvanceService.verifyGstAdvance({
      gstin,
      clientRefNum: client_ref_num,
      apiClient: req.apiClient,
    });

    return res.status(data.status_code || 200).json(data);
  }),
};

export default GstAuthenticatedAdvanceController;
