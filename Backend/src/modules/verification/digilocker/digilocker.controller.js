import { ENV } from '../../../core/config/env.config.js';
import DigilockerVerificationService from './digilocker.service.js';

export class DigilockerController {
  /**
   * POST /srv2/validation/digilocker-digital-kyc
   * Supports both multi-method structure (methods.generateToken / methods.fetchDetails) and flat structure
   */
  static async handleRequest(req, res, next) {
    try {
      const body = req.body || {};
      const methodObj = body.methods?.generateToken || body.methods?.fetchDetails || body.generateToken || body.fetchDetails || {};
      const hostBase = `${req.protocol}://${req.get('host')}`;

      const response = await DigilockerVerificationService.processDigilockerRequest({
        method: body.method || body.methodName || methodObj.methodName || (body.methods?.fetchDetails || body.fetchDetails ? 'fetchDetails' : 'generateToken'),
        redirect_url: body.redirect_url || body.redirectUrl || body.RedirectUrl || methodObj.redirectUrl || methodObj.redirect_url,
        logo_url: body.logo_url || body.logoUrl || body.LogoUrl || methodObj.logoUrl || methodObj.logo_url,
        aadhaar_number: body.aadhaar_number || body.aadhaarNumber || body.aadhaar || body['Aadhaar Number'] || methodObj.aadhaar_number || methodObj['Aadhaar Number'],
        client_id: body.client_id || body.clientId || methodObj.client_id || methodObj.clientId,
        client_ref_num: body.client_ref_num || body.clientRefNum || methodObj.client_ref_num,
        apiClient: {
          ...(req.apiClient || {}),
          hostBase,
        },
        rawBody: body,
      });

      const httpCode = response.http_response_code || 200;
      return res.status(httpCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /srv2/v1/digilocker/start/:sessionId
   * GET /digilocker/start/:sessionId
   * GET /srv2/validation/digilocker-digital-kyc/auth
   * Transparent redirect gateway for white-labeled DigiLocker consent flows
   */
  static async handleConsentRedirect(req, res, next) {
    try {
      const sessionId = req.params.sessionId || req.params.id || '';
      const queryString = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';

      let upstreamRedirectUrl;
      if (sessionId) {
        upstreamRedirectUrl = `https://javabackend.idspay.in/api/v1/prod/srv2/v1/digilocker/start/${encodeURIComponent(sessionId)}${queryString}`;
      } else if (req.path.includes('/auth')) {
        upstreamRedirectUrl = `https://javabackend.idspay.in/api/v1/prod/srv2/validation/digilocker-digital-kyc/auth${queryString}`;
      } else {
        upstreamRedirectUrl = `https://javabackend.idspay.in/api/v1/prod${req.originalUrl}`;
      }

      console.log(`🔀 [WHITE-LABEL GATEWAY] Transparently redirecting DigiLocker consent flow to upstream`);
      return res.redirect(302, upstreamRedirectUrl);
    } catch (error) {
      next(error);
    }
  }
}

export default DigilockerController;
