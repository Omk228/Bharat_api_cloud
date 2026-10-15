import SenderService from './sender.service.js';
import { authService } from '../auth/auth.service.js';
import { userModel } from '../auth/user.model.js';
import { CredentialService } from '../credentials/credential.service.js';
import { CredentialModel } from '../credentials/credential.model.js';
import { dbPool } from '../../core/config/db.config.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../../core/config/env.config.js';

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

  /**
   * Banger User Authentication (uses Bharat API users and api_credentials database)
   * POST /api/v1/sender/auth/login or POST /api/v1/banger/auth/login
   */
  static async handleBangerLogin(req, res, next) {
    try {
      const email = req.body?.email;
      const password = req.body?.password;

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required',
        });
      }

      // Authenticate directly against Bharat API database via authService
      const authResult = await authService.login({ email, password });
      const user = authResult.user;

      // Fetch user's active API credentials from api_credentials
      const creds = await CredentialService.getUserCredentials(user.id);
      const activeCred = creds && creds.length > 0 ? creds[0] : null;

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            company_name: user.company_name,
            wallet_balance: parseFloat(user.wallet_balance || '0.00'),
            plan: user.plan,
          },
          credentials: {
            credential_id: activeCred?.id || null,
            api_id: activeCred?.api_id || null,
            api_key: activeCred?.api_key || null,
            token_id: activeCred?.token_id || null,
            token_id_preview: activeCred?.token_id_preview || null,
            environment: activeCred?.environment || 'sandbox',
            label: activeCred?.label || 'Default Key',
          },
          token: authResult.token,
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 401).json({
        status: 'error',
        message: err.message || 'Invalid email or password',
      });
    }
  }

  /**
   * Fetch current user profile & live wallet balance
   * GET /api/v1/sender/auth/me or GET /api/v1/banger/auth/me
   */
  static async handleBangerGetMe(req, res, next) {
    try {
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (token) {
          try {
            const decoded = jwt.verify(token, ENV.JWT.SECRET);
            userId = decoded.id;
          } catch (e) {}
        }
      }

      if (!userId) {
        const apiId = req.headers['x-api-id'] || req.headers['x_api_id'] || req.query.api_id;
        const apiKey = req.headers['x-api-key'] || req.headers['x_api_key'] || req.query.api_key;
        if (apiId && apiKey) {
          const cred = await CredentialModel.findActiveByApiIdAndKey(String(apiId).trim(), String(apiKey).trim());
          if (cred) userId = cred.user_id;
        }
      }

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Session token or API credentials required',
        });
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      const creds = await CredentialService.getUserCredentials(user.id);
      const activeCred = creds && creds.length > 0 ? creds[0] : null;

      return res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            company_name: user.company_name,
            wallet_balance: parseFloat(user.wallet_balance || '0.00'),
            plan: user.plan,
          },
          credentials: {
            credential_id: activeCred?.id || null,
            api_id: activeCred?.api_id || null,
            api_key: activeCred?.api_key || null,
            token_id: activeCred?.token_id || null,
            token_id_preview: activeCred?.token_id_preview || null,
            environment: activeCred?.environment || 'sandbox',
            label: activeCred?.label || 'Default Key',
          },
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch user profile',
      });
    }
  }

  /**
   * Start Banger Session with Wallet Deduction and API Hit Logging
   * POST /api/v1/sender/start or POST /api/v1/banger/start
   * - SMS + WhatsApp: ₹10.00 per hit (covers 20 iterations)
   * - Call + SMS: ₹15.00 per hit (covers 25 iterations)
   * - Deducts money ONCE when start button is clicked
   * - Records hit log in api_hit_logs for that specific user
   */
  static async handleBangerStart(req, res, next) {
    try {
      // 1. Resolve User ID & Credentials
      let userId = req.user?.id;
      let activeCred = null;

      if (!userId) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (token) {
          try {
            const decoded = jwt.verify(token, ENV.JWT.SECRET);
            userId = decoded.id;
          } catch (e) {}
        }
      }

      const apiId = req.headers['x-api-id'] || req.headers['x_api_id'] || req.body?.api_id;
      const apiKey = req.headers['x-api-key'] || req.headers['x_api_key'] || req.body?.api_key;

      if (apiId && apiKey) {
        const cred = await CredentialModel.findActiveByApiIdAndKey(String(apiId).trim(), String(apiKey).trim());
        if (cred) {
          if (!userId) userId = cred.user_id;
          activeCred = cred;
        }
      }

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Please log in with your Bharat API account to use Banger.',
        });
      }

      if (!activeCred) {
        const creds = await CredentialService.getUserCredentials(userId);
        activeCred = creds && creds.length > 0 ? creds[0] : null;
      }

      // 2. Validate Target Phone
      const rawTarget = req.body?.phone || req.body?.number || req.body?.mobile;
      const cleanPhone = String(rawTarget || '').trim().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid 10-digit target phone number is required.',
        });
      }

      // 3. Resolve Mode, Price & Iterations according to exact user rules:
      // - SMS + WhatsApp: ₹10 per hit (covers 20 iterations)
      // - Call + SMS: ₹15 per hit (covers 25 iterations)
      const rawMode = String(req.body?.mode || 'sms_wa').toLowerCase().replace('+', '_').replace(' ', '_');
      const isSmsCall = rawMode.includes('call');
      const mode = isSmsCall ? 'sms_call' : 'sms_wa';
      
      const cost = isSmsCall ? 15.00 : 10.00;
      const targetIterations = isSmsCall ? 25 : 20;
      const serviceName = isSmsCall ? 'Banger Call + SMS' : 'Banger SMS + WhatsApp';
      const endpoint = isSmsCall ? '/sender/call-sms' : '/sender/sms-whatsapp';

      // 4. Verify User Status & Wallet Balance
      const [[userRow]] = await dbPool.query(
        'SELECT id, name, email, wallet_balance, is_active FROM users WHERE id = ?',
        [userId]
      );

      if (!userRow) {
        return res.status(404).json({ status: 'error', message: 'User account not found.' });
      }

      if (userRow.is_active === 0 || userRow.is_active === false) {
        return res.status(403).json({
          status: 'error',
          message: 'Your account is suspended by admin. Please contact support.',
        });
      }

      const currentBalance = parseFloat(userRow.wallet_balance || '0.00');

      if (currentBalance < cost) {
        return res.status(402).json({
          status: 'error',
          message: `Insufficient wallet balance (₹${cost.toFixed(2)} required, current balance: ₹${currentBalance.toFixed(2)}). Please recharge your wallet in Bharat API panel.`,
          required_balance: cost,
          current_balance: currentBalance,
        });
      }

      // 5. Atomically Deduct Money ONCE from users.wallet_balance
      await dbPool.query(
        'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
        [cost, userId]
      );

      const [[updatedUserRow]] = await dbPool.query(
        'SELECT wallet_balance FROM users WHERE id = ?',
        [userId]
      );
      const newBalance = parseFloat(updatedUserRow?.wallet_balance || '0.00');

      // 6. Insert Hit Log into api_hit_logs for this specific user
      const requestId = `req_bgr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const environment = activeCred?.environment || 'production';

      await dbPool.query(
        `INSERT INTO api_hit_logs (
          user_id, credential_id, endpoint, method, request_id,
          client_ref_num, status_code, result_code, latency_ms,
          client_ip, cost, environment
        ) VALUES (?, ?, ?, 'POST', ?, ?, 200, 101, 50, ?, ?, ?)`,
        [
          userId,
          activeCred?.id || null,
          endpoint,
          requestId,
          cleanPhone,
          clientIp,
          cost,
          environment,
        ]
      );

      // 7. Record transaction in wallet_transactions ledger for audit history
      try {
        await dbPool.query(
          `INSERT INTO wallet_transactions (
            user_id, type, amount, balance_after, category, description, reference_id, status
          ) VALUES (?, 'debit', ?, ?, 'api_usage', ?, ?, 'success')`,
          [
            userId,
            cost,
            newBalance,
            `Banger ${serviceName} (1 Hit = ${targetIterations} Iterations) for +91 ${cleanPhone}`,
            requestId,
          ]
        );
      } catch (ledgerErr) {
        console.warn('Note: wallet_transactions ledger write skipped:', ledgerErr.message);
      }

      // 8. Return response with updated wallet balance
      return res.status(200).json({
        status: 'success',
        message: `Banger session started. ₹${cost.toFixed(2)} deducted from wallet.`,
        data: {
          cost_deducted: cost,
          new_wallet_balance: newBalance,
          previous_balance: currentBalance,
          target_iterations: targetIterations,
          mode,
          request_id: requestId,
          phone: cleanPhone,
          service_name: serviceName,
        },
      });
    } catch (err) {
      console.error('❌ [BANGER START ERROR]:', err);
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to start Banger session',
      });
    }
  }
}

export default SenderController;
