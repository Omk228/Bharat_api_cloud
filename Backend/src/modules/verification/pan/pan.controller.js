import PanVerificationService from './pan.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export class PanVerificationController {
  /**
   * Handler for POST /srv2/validation/pan and POST /api/v1/verify/pan
   */
  static verifyPan = asyncHandler(async (req, res) => {
    const { pan, name, pan_display_name, name_match_method, client_ref_num } = req.body;

    if (!pan) {
      return res.status(200).json({
        http_response_code: 200,
        result_code: 102,
        request_id: crypto.randomUUID(),
        client_ref_num: client_ref_num || null,
        message: 'Invalid Pan number or combination of inputs',
        status_message: 'Refund processed',
        result: {
          pan: '',
          pan_status: 'Invalid',
          pan_type: '',
          fullname: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: '',
          aadhaar_seeding_status: '',
          aadhaar_number: '',
          aadhaar_linked: '',
          dob: '',
          address: {
            building_name: '',
            locality: '',
            street_name: '',
            pincode: '',
            city: '',
            state: '',
            country: ''
          },
          mobile: '',
          email: ''
        }
      });
    }

    const response = await PanVerificationService.verifyPan({
      pan,
      name,
      pan_display_name,
      name_match_method,
      client_ref_num,
      apiClient: req.apiClient
    });

    return res.status(200).json(response);
  });
}

export default PanVerificationController;
