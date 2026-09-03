import NameFinderVerificationService from './nameFinder.service.js';

export class NameFinderVerificationController {
  /**
   * Handle Mobile To Name Finder Request
   * Endpoint: POST /srv2/mobile-name-finder
   */
  static async verifyMobileNameFinder(req, res, next) {
    try {
      const mobile =
        req.body.mobile ||
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.phone;

      const clientRefNum = req.body.client_ref_num || req.body.clientRefNum;

      if (!mobile) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Missing required parameter: mobile is mandatory.',
          status_message: 'Invalid request',
          data: null
        });
      }

      const cleanMobile = String(mobile).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Invalid 10-digit Indian mobile number format.',
          status_message: 'Invalid request',
          data: null
        });
      }

      const verificationResult = await NameFinderVerificationService.verifyMobileNameFinder({
        mobile: cleanMobile,
        client_ref_num: clientRefNum,
        apiClient: req.apiClient
      });

      return res.status(200).json(verificationResult);
    } catch (err) {
      next(err);
    }
  }
}

export default NameFinderVerificationController;
