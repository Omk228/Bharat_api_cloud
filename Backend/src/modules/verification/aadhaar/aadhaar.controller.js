import { AadhaarVerificationService } from './aadhaar.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

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

  /**
   * Handler for POST /srv2/digital-kyc/aadhar/auto-verificationSpecial
   */
  static autoVerificationSpecial = asyncHandler(async (req, res) => {
    const result = await AadhaarVerificationService.autoVerificationSpecial({
      body: req.body,
      apiClient: req.apiClient
    });

    const statusCode =
      result?.methods?.generateToken?.status?.code ||
      result?.methods?.fetchDetails?.status?.code ||
      result?.status?.code ||
      result?.http_response_code ||
      200;

    return res.status(statusCode >= 200 && statusCode < 600 ? statusCode : 200).json(result);
  });
}

export default AadhaarVerificationController;
