import SenderService from './sender.service.js';

export class SenderController {
  /**
   * Handler for SMS Dispatch
   * POST /api/v1/sender/sms or GET /api/v1/sender/sms
   */
  static async handleSendSms(req, res, next) {
    try {
      const payload = {
        phone: req.body?.phone || req.query?.phone || req.body?.number || req.query?.number || req.body?.mobile || req.query?.mobile,
        duration: req.body?.duration || req.query?.duration,
        batch: req.body?.batch || req.query?.batch,
      };

      if (!payload.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Target phone number is required (field: phone, number, or mobile)',
        });
      }

      const result = await SenderService.sendSms(payload);

      return res.status(200).json({
        status: result.success ? 'success' : 'error',
        data: result,
        upstreamJson: result.upstreamJson || result.response,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handler for Voice Call Dispatch
   * POST /api/v1/sender/call or GET /api/v1/sender/call
   */
  static async handleSendCall(req, res, next) {
    try {
      const payload = {
        phone: req.body?.phone || req.query?.phone || req.body?.number || req.query?.number || req.body?.mobile || req.query?.mobile,
      };

      if (!payload.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Target phone number is required (field: phone, number, or mobile)',
        });
      }

      const result = await SenderService.sendCall(payload);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handler for Unified Dispatch (SMS, Call, or Both)
   * POST /api/v1/sender/dispatch or GET /api/v1/sender/dispatch
   */
  static async handleDispatch(req, res, next) {
    try {
      const payload = {
        phone: req.body?.phone || req.query?.phone || req.body?.number || req.query?.number || req.body?.mobile || req.query?.mobile,
        channel: req.body?.channel || req.query?.channel || 'both',
      };

      if (!payload.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Target phone number is required (field: phone, number, or mobile)',
        });
      }

      const result = await SenderService.dispatch(payload);

      return res.status(200).json({
        status: 'success',
        data: result,
        upstreamJson: result.upstreamJson,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handler to get current call rotation status and timer
   * GET /api/v1/sender/status
   */
  static async handleGetStatus(req, res, next) {
    try {
      const status = SenderService.getStatus();
      return res.status(200).json({
        status: 'success',
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Start a refresh loop (20 iterations for sms_wa, 25 iterations for sms_call)
   * POST /api/v1/sender/loop or POST /api/v1/sender/loop/start
   */
  static async handleStartLoop(req, res, next) {
    try {
      const payload = {
        phone: req.body?.phone || req.query?.phone || req.body?.number || req.query?.number || req.body?.mobile || req.query?.mobile,
        mode: req.body?.mode || req.query?.mode || req.body?.channel || req.query?.channel || 'sms_call',
        maxIterations: req.body?.maxIterations || req.query?.maxIterations,
        intervalMs: req.body?.intervalMs || req.query?.intervalMs,
      };

      if (!payload.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Target phone number is required (field: phone, number, or mobile)',
        });
      }

      const result = await SenderService.startLoop(payload);
      return res.status(200).json({
        status: result.success ? 'success' : 'error',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Stop an active loop
   * POST /api/v1/sender/loop/stop
   */
  static async handleStopLoop(req, res, next) {
    try {
      const identifier = req.body?.phone || req.body?.loopId || req.query?.phone || req.query?.loopId;
      const result = SenderService.stopLoop(identifier);
      return res.status(200).json({
        status: result.success ? 'success' : 'error',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get status of active loop(s)
   * GET /api/v1/sender/loop/status or GET /api/v1/sender/loop
   */
  static async handleGetLoopStatus(req, res, next) {
    try {
      const identifier = req.query?.phone || req.query?.loopId;
      const result = SenderService.getLoopStatus(identifier);
      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default SenderController;
