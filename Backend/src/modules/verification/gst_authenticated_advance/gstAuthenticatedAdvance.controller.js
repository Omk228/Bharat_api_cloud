import { GstAuthenticatedAdvanceService } from './gstAuthenticatedAdvance.service.js';
import { ApiResponse } from '../../../core/utils/apiResponse.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export class GstAuthenticatedAdvanceController {
  static verify = asyncHandler(async (req, res) => {
    const { gstin, client_ref_num } = req.body;

    const data = await GstAuthenticatedAdvanceService.verifyGstAdvance({
      gstin,
      clientRefNum: client_ref_num,
      apiClient: req.apiClient,
    });

    return res.status(data.status_code || 200).json(data);
  });
}

export default GstAuthenticatedAdvanceController;
