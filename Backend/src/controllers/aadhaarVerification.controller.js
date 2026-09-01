import { AadhaarVerificationService } from '../services/aadhaarVerification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class AadhaarVerificationController {
  /**
   * Handler for POST /srv3/verification/aadhar and POST /api/v1/verify/aadhaar/direct
   */
  static verifyAadhaar = asyncHandler(async (req, res) => {
    const { aadhaar, aadhaar_number, name, client_ref_num } = req.body;

    const result = await AadhaarVerificationService.verifyAadhaar({
      aadhaar: aadhaar || aadhaar_number,
      name,
      client_ref_num,
      apiClient: req.apiClient
    });

    const statusCode =
      result.http_response_code ||
      result.status?.code ||
      200;

    return res.status(statusCode).json(result);
  });
}
