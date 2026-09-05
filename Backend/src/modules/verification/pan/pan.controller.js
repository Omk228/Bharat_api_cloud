import PanVerificationService from './pan.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export class PanVerificationController {
  /**
   * Handler for POST /srv2/validation/pan and POST /api/v1/verify/pan
   */
  static verifyPan = asyncHandler(async (req, res) => {
    const { name, pan_display_name, name_match_method, client_ref_num } = req.body;
    const pan = req.body.pan || req.body.pan_number || req.query?.pan || req.query?.pan_number;

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

  /**
   * Handler for POST /srv2/validation/pan/plus
   */
  static verifyPanPlus = asyncHandler(async (req, res) => {
    const pan = req.body?.pan || req.query?.pan;
    const clientRefNum = req.body?.client_ref_num || req.body?.clientRefNum || req.query?.client_ref_num;

    if (!pan) {
      return res.status(400).json({
        status: {
          code: 400,
          type: 'failed',
          message: 'Missing required parameter: pan is mandatory (10 alphanumeric characters).',
        },
        message: 'Missing required parameter: pan is mandatory (10 alphanumeric characters).',
        data: null,
      });
    }

    const cleanPan = String(pan).trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return res.status(400).json({
        status: {
          code: 400,
          type: 'failed',
          message: 'Invalid Indian PAN format. Expected format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
        },
        message: 'Invalid Indian PAN format. Expected format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
        data: null,
      });
    }

    const response = await PanVerificationService.verifyPanPlus({
      pan: cleanPan,
      client_ref_num: clientRefNum,
      apiClient: req.apiClient,
    });

    return res.status(200).json(response);
  });
}

export default PanVerificationController;
