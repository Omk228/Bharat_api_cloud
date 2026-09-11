import fs from 'node:fs';
import path from 'node:path';
import { dbPool } from '../../core/config/db.config.js';
import { ApiError } from '../../core/utils/apiError.js';
import CacheService from '../../core/cache/cache.service.js';

/**
 * Helper to save Base64 screenshot/receipt to server disk storage (/uploads/receipts/)
 */
async function saveScreenshotFile(screenshotBase64, userId, utr) {
  if (!screenshotBase64 || typeof screenshotBase64 !== 'string') return null;

  // If already an HTTP URL or local static path, return as is
  if (
    screenshotBase64.startsWith('http://') ||
    screenshotBase64.startsWith('https://') ||
    screenshotBase64.startsWith('/uploads/')
  ) {
    return screenshotBase64;
  }

  // Check if it's a data URL (e.g. data:image/png;base64,....)
  const matches = screenshotBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return screenshotBase64; // fallback to storing string
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  let ext = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('pdf')) ext = 'pdf';
  else if (mimeType.includes('png')) ext = 'png';

  const cleanUtr = String(utr || 'receipt').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `receipt_u${userId}_${cleanUtr}_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');

  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/receipts/${fileName}`;
  } catch (err) {
    console.error('Failed to save screenshot file to disk:', err);
    return screenshotBase64; // fallback to raw string
  }
}

export const walletService = {
  /**
   * Get current live wallet balance for a user
   * @param {number} userId 
   */
  async getBalance(userId) {
    const [[user]] = await dbPool.query(
      'SELECT id, name, email, wallet_balance, plan FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const balance = parseFloat(user.wallet_balance || '0.00');

    // Get today's spend
    const [[spendRow]] = await dbPool.query(
      `SELECT COALESCE(SUM(amount), 0.00) as today_spend
       FROM wallet_transactions
       WHERE user_id = ? AND type = 'debit' AND created_at >= CURDATE()`,
      [userId]
    );
    const todaySpend = parseFloat(spendRow?.today_spend || '0.00');

    // Get this month's spend
    const [[monthSpendRow]] = await dbPool.query(
      `SELECT COALESCE(SUM(amount), 0.00) as month_spend
       FROM wallet_transactions
       WHERE user_id = ? AND type = 'debit' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [userId]
    );
    const monthSpend = parseFloat(monthSpendRow?.month_spend || '0.00');

    // Get total API hits count
    const [[hitsRow]] = await dbPool.query(
      'SELECT COUNT(*) as total_hits FROM api_hit_logs WHERE user_id = ?',
      [userId]
    );
    const totalHits = parseInt(hitsRow?.total_hits || 0, 10);

    // Get today's API hits count
    const [[todayHitsRow]] = await dbPool.query(
      'SELECT COUNT(*) as today_hits FROM api_hit_logs WHERE user_id = ? AND created_at >= CURDATE()',
      [userId]
    );
    const todayHits = parseInt(todayHitsRow?.today_hits || 0, 10);

    // Get this month's API hits count
    const [[monthHitsRow]] = await dbPool.query(
      "SELECT COUNT(*) as month_hits FROM api_hit_logs WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')",
      [userId]
    );
    const monthHits = parseInt(monthHitsRow?.month_hits || 0, 10);

    // Get successful API hits count (status 200)
    const [[successHitsRow]] = await dbPool.query(
      'SELECT COUNT(*) as success_hits FROM api_hit_logs WHERE user_id = ? AND status_code = 200',
      [userId]
    );
    const successHits = parseInt(successHitsRow?.success_hits || 0, 10);

    return {
      wallet_balance: balance,
      today_spend: todaySpend,
      month_spend: monthSpend,
      total_hits: totalHits,
      today_hits: todayHits,
      month_hits: monthHits,
      success_hits: successHits,
      plan: user.plan || 'free',
    };
  },

  /**
   * Get paginated wallet transactions ledger
   * @param {number} userId 
   * @param {object} options 
   */
  async getTransactions(userId, { limit = 50, offset = 0, type = null, search = null } = {}) {
    let query = `
      SELECT id, user_id, type, amount, balance_after, category, description, reference_id, status, utr_number, admin_notes, payment_screenshot, created_at
      FROM wallet_transactions
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type && (type === 'credit' || type === 'debit')) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search && search.trim()) {
      query += ' AND (description LIKE ? OR reference_id LIKE ? OR utr_number LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await dbPool.query(query, params);

    // Format for frontend consumption
    return rows.map((row) => ({
      id: `tx_${row.id}`,
      numeric_id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      balance_after: parseFloat(row.balance_after),
      category: row.category,
      description: row.description,
      reference_id: row.reference_id || `ref_${row.id}`,
      status: row.status || 'success',
      utr_number: row.utr_number || null,
      admin_notes: row.admin_notes || null,
      payment_screenshot: row.payment_screenshot || null,
      created_at: row.created_at,
    }));
  },

  /**
   * Get API hit logs for the user
   * @param {number} userId 
   * @param {object} options 
   */
  async getHitLogs(userId, { limit = 50, offset = 0, statusCode = null, search = null } = {}) {
    // Fetch default user API credentials as fallback if log has no credential_id
    const [userCreds] = await dbPool.query(
      'SELECT api_key, api_id, label FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId]
    );
    const userDefaultCred = userCreds && userCreds.length > 0 ? userCreds[0] : null;

    let query = `
      SELECT l.id, l.user_id, l.credential_id, l.endpoint, l.method, l.request_id,
             l.client_ref_num, l.status_code, l.result_code, l.latency_ms,
             l.client_ip, l.cost, l.environment, l.created_at,
             c.api_key, c.api_id, c.label as credential_label
      FROM api_hit_logs l
      LEFT JOIN api_credentials c ON l.credential_id = c.id
      WHERE l.user_id = ?
    `;
    const params = [userId];

    if (statusCode) {
      if (statusCode === 200) {
        query += ' AND l.status_code = 200';
      } else {
        query += ' AND l.status_code != 200';
      }
    }

    if (search && search.trim()) {
      query += ' AND (l.request_id LIKE ? OR l.endpoint LIKE ? OR l.client_ref_num LIKE ? OR c.api_key LIKE ? OR c.api_id LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await dbPool.query(query, params);

    const ENDPOINT_SERVICE_MAP = {
      '/srv2/validation/pan': 'Verify PAN',
      '/verify/pan': 'Verify PAN',
      '/pan': 'Verify PAN',
      '/srv2/validation/pan/plus': 'Pan Details Plus',
      '/srv3/verification/aadhar': 'Aadhar Fetch (Without OTP)',
      '/verify/aadhar': 'Aadhar Fetch (Without OTP)',
      '/srv2/validation/digilocker-digital-kyc': 'Digi Locker Digital KYC',
      '/bank/verify/penny-less': 'Bank Verification Penny Less V2',
      '/idfc/beneficiary': 'Bank Verification Penny Less V2',
      '/api/v1/validate_bank_account': 'Bank Account Validation',
      '/validate_bank_account': 'Bank Account Validation',
      '/srv3/mobile-to-bank/advance': 'Mobile To Bank Advance',
      '/ifsc': 'IFSC Lookup',
      '/bank/ifsc': 'IFSC Lookup',
      '/srv2/mobile-upi-lookup/enhanced': 'Mobile to UPI Lookup Advance',
      '/srv4/credit-report/prefill': 'Mobile to Prefill',
      '/kyc/mobile-prefill': 'Mobile to Prefill',
      '/srv5/transunion-Score-Hybrid': 'Transunion Credit Report V5',
      '/transunion-Score-Hybrid': 'Transunion Credit Report V5',
      '/srv2/mobile-name-finder': 'Mobile To Name Finder',
      '/api/v1/srv3/uan-mobile': 'Mobile to UAN V2',
      '/srv3/uan-mobile': 'Mobile to UAN V2',
      '/api/v1/srv3/uan-direct': 'UAN to Employment History V2',
      '/srv3/uan-direct': 'UAN to Employment History V2',
      '/dosvak/domain-age': 'Domain Age Verification API',
      '/check': 'Requester IP Lookup',
      '/reverse': 'Reverse Geocoding',
      '/reverse-geocode': 'Reverse Geocoding',
      '/verify/aadhaar/otp': 'Aadhaar OTP (DigiLocker)',
      '/verify/aadhaar/otp/confirm': 'Confirm Aadhaar OTP',
      '/verify/gstin': 'Verify GSTIN',
      '/verify/cin': 'Verify CIN (MCA)',
      '/kyc/ocr': 'Document OCR',
      '/kyc/face-match': 'Face Match & Liveness',
      '/verify/voter-id': 'Verify Voter ID',
      '/verify/driving-licence': 'Verify Driving Licence',
      '/verify/passport': 'Verify Passport',
      '/kyc/aml-screen': 'AML / PEP Screening',
      '/bank/verify': 'Bank Verification (Penny Drop)',
      '/bank/penny-drop': 'Bank Verification (Penny Drop)',
      '/bank/reverse-penny-drop': 'Reverse Penny Drop',
      '/bank/upi/validate': 'Validate UPI VPA',
      '/bank/statement/analyse': 'Bank Statement Analysis',
      '/statement-analyzer': 'Bank Statement Analyzer V2',
      '/srv2/statement-analyzer': 'Bank Statement Analyzer V2',
      '/statement-upload': 'Bank Statement Analyzer V2',
      '/srv2/statement-upload': 'Bank Statement Analyzer V2',
      '/crif/Credit-ScoreV4': 'CRIF High Mark Credit Score V4',
      '/api/v1/crif/Credit-ScoreV4': 'CRIF High Mark Credit Score V4',
      '/Credit-ScoreV4': 'CRIF High Mark Credit Score V4',
      '/reports/cibil': 'Transunion PDF Report',
      '/api/v1/reports/cibil': 'Transunion PDF Report',
      '/aa/consent': 'Create Consent Request',
      '/v1/aa/consent': 'Create Consent Request',
      '/payouts': 'Create Payout',
      '/virtual-accounts': 'Create Virtual Account',
    };

    return rows.map((row) => {
      let serviceName = row.catalog_service_name || '';
      if (!serviceName) {
        const cleanEp = (row.endpoint || '').split('?')[0].trim();
        serviceName = ENDPOINT_SERVICE_MAP[cleanEp];
        if (!serviceName) {
          for (const [key, name] of Object.entries(ENDPOINT_SERVICE_MAP)) {
            if (cleanEp.endsWith(key) || cleanEp.includes(key)) {
              serviceName = name;
              break;
            }
          }
        }
      }
      if (!serviceName) {
        const parts = (row.endpoint || '').split('?')[0].split('/').filter(Boolean);
        if (parts.length > 0) {
          serviceName = parts[parts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        } else {
          serviceName = row.endpoint || 'API Request';
        }
      }

      let group = row.catalog_category || 'KYC';
      if (row.endpoint.includes('idfc') || row.endpoint.includes('bank') || row.endpoint.includes('ifsc')) group = 'Banking';
      else if (row.endpoint.includes('prefill') || row.endpoint.includes('credit-report')) group = 'KYC';
      else if (row.endpoint.includes('pan') || row.endpoint.includes('aadhar') || row.endpoint.includes('kyc')) group = 'KYC';
      else if (row.endpoint.includes('upi') || row.endpoint.includes('payout')) group = 'Payments';

      // Mask the assigned API key: e.g. 663e••••650d
      const rawKey = row.api_key || userDefaultCred?.api_key || '';
      let maskedKey = '••••••••';
      if (rawKey) {
        const clean = String(rawKey).trim();
        maskedKey = clean.length > 8
          ? `${clean.substring(0, 4)}••••${clean.substring(clean.length - 4)}`
          : clean;
      } else if (row.api_id || userDefaultCred?.api_id) {
        maskedKey = String(row.api_id || userDefaultCred?.api_id);
      }

      return {
        id: `log_hit_${row.id}`,
        request_id: row.request_id,
        service_name: serviceName,
        endpoint: row.endpoint,
        method: row.method,
        group,
        status_code: row.status_code,
        response_time_ms: row.latency_ms,
        cost_deducted: parseFloat(row.cost || '0.00'),
        api_key_used: maskedKey,
        key_label: row.credential_label || userDefaultCred?.label || 'Default Sandbox Key',
        environment: row.environment || 'production',
        ip_address: row.client_ip || '127.0.0.1',
        client_ref_num: row.client_ref_num,
        created_at: row.created_at,
      };
    });
  },

  /**
   * Submit Recharge Request with UTR for Admin Verification
   * @param {number} userId 
   * @param {object} param1 
   */
  async submitRechargeRequest(userId, { amount, utr_number, method = 'Bank Account Transfer', screenshot = null }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw ApiError.badRequest('Please enter a valid positive recharge amount');
    }

    const cleanUtr = String(utr_number || '').trim().replace(/[\s-]/g, '');
    if (!cleanUtr || cleanUtr.length < 6) {
      throw ApiError.badRequest('Please enter a valid Bank UTR or IMPS/NEFT Reference Number');
    }

    // Check for duplicate UTR
    const [[existing]] = await dbPool.query(
      'SELECT id, user_id, amount, status, created_at FROM wallet_transactions WHERE utr_number = ?',
      [cleanUtr]
    );

    if (existing) {
      const statusText = existing.status ? existing.status.toUpperCase() : 'PROCESSED';
      throw ApiError.badRequest(
        `This UTR (${cleanUtr}) has already been submitted (Status: ${statusText}). If you believe this is an error, please contact admin support.`
      );
    }

    // Fetch current user wallet balance (balance is NOT updated yet)
    const [[user]] = await dbPool.query(
      'SELECT wallet_balance FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    const currentBalance = parseFloat(user.wallet_balance || '0.00');
    const ref = `req_utr_${Date.now()}`;

    // Save screenshot file to server disk uploads if provided
    const savedScreenshot = await saveScreenshotFile(screenshot, userId, cleanUtr);

    // Record pending transaction with optional payment screenshot
    const [result] = await dbPool.query(
      `INSERT INTO wallet_transactions (
        user_id, type, amount, balance_after, category, description, reference_id, status, utr_number, payment_screenshot
      ) VALUES (?, 'credit', ?, ?, 'topup', ?, ?, 'pending', ?, ?)`,
      [
        userId,
        numAmount,
        currentBalance,
        `Wallet Recharge via ${method} (UTR: ${cleanUtr})`,
        ref,
        cleanUtr,
        savedScreenshot || null
      ]
    );

    return {
      transaction_id: `tx_${result.insertId}`,
      numeric_id: result.insertId,
      amount: numAmount,
      utr_number: cleanUtr,
      status: 'pending',
      has_screenshot: Boolean(screenshot),
      message: 'Payment details & screenshot submitted successfully. Please allow 2-5 minutes for admin verification.',
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Get all recharge requests for Admin Panel
   */
  async getAdminRechargeRequests({ status = 'all', search = null, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT t.id, t.user_id, t.type, t.amount, t.balance_after, t.category, 
             t.description, t.reference_id, t.status, t.utr_number, t.admin_notes, 
             t.payment_screenshot, t.approved_at, t.created_at,
             u.name as user_name, u.email as user_email, u.company_name as user_company,
             u.wallet_balance as current_user_balance
      FROM wallet_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.category = 'topup'
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      query += ' AND (t.utr_number LIKE ? OR t.reference_id LIKE ? OR u.email LIKE ? OR u.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await dbPool.query(query, params);

    return rows.map((row) => ({
      id: `tx_${row.id}`,
      numeric_id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      user_company: row.user_company || '',
      current_user_balance: parseFloat(row.current_user_balance || '0.00'),
      type: row.type,
      amount: parseFloat(row.amount),
      balance_after: parseFloat(row.balance_after),
      category: row.category,
      description: row.description,
      reference_id: row.reference_id,
      status: row.status || 'pending',
      utr_number: row.utr_number || '',
      admin_notes: row.admin_notes || null,
      payment_screenshot: row.payment_screenshot || null,
      approved_at: row.approved_at,
      created_at: row.created_at,
    }));
  },

  /**
   * Approve a pending recharge request (Admin)
   */
  async approveRechargeRequest(transactionId, { adminNotes = 'Approved via Admin Panel' } = {}) {
    const cleanId = String(transactionId).replace('tx_', '');

    const [[txn]] = await dbPool.query(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [cleanId]
    );

    if (!txn) {
      throw ApiError.notFound('Recharge transaction not found');
    }

    if (txn.status === 'success') {
      throw ApiError.badRequest('This recharge request has already been approved and credited.');
    }

    const numAmount = parseFloat(txn.amount);

    // Atomically increment user wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [numAmount, txn.user_id]
    );

    const [[user]] = await dbPool.query(
      'SELECT wallet_balance FROM users WHERE id = ?',
      [txn.user_id]
    );
    const newBalance = parseFloat(user?.wallet_balance || '0.00');

    // Update transaction to success
    await dbPool.query(
      `UPDATE wallet_transactions 
       SET status = 'success', balance_after = ?, admin_notes = ?, approved_at = NOW() 
       WHERE id = ?`,
      [newBalance, adminNotes, cleanId]
    );

    return {
      transaction_id: `tx_${txn.id}`,
      numeric_id: txn.id,
      user_id: txn.user_id,
      amount_credited: numAmount,
      new_wallet_balance: newBalance,
      status: 'success',
      approved_at: new Date().toISOString(),
    };
  },

  /**
   * Reject a pending recharge request (Admin)
   */
  async rejectRechargeRequest(transactionId, { reason = 'Invalid or Unmatched UTR' } = {}) {
    const cleanId = String(transactionId).replace('tx_', '');

    const [[txn]] = await dbPool.query(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [cleanId]
    );

    if (!txn) {
      throw ApiError.notFound('Recharge transaction not found');
    }

    if (txn.status === 'success') {
      throw ApiError.badRequest('Cannot reject a transaction that has already been approved and credited.');
    }

    await dbPool.query(
      `UPDATE wallet_transactions 
       SET status = 'rejected', admin_notes = ? 
       WHERE id = ?`,
      [reason, cleanId]
    );

    return {
      transaction_id: `tx_${txn.id}`,
      numeric_id: txn.id,
      user_id: txn.user_id,
      status: 'rejected',
      reason,
    };
  },

  /**
   * Add funds (Top-up) to user's wallet
   * @param {number} userId 
   * @param {object} param1 
   */
  async topupWallet(userId, { amount, method = 'UPI / NetBanking', referenceId = null }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw ApiError.badRequest('Amount must be a positive number');
    }

    // Atomic increment in DB
    await dbPool.query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [numAmount, userId]
    );

    const [[user]] = await dbPool.query(
      'SELECT wallet_balance FROM users WHERE id = ?',
      [userId]
    );
    const balanceAfter = parseFloat(user?.wallet_balance || '0.00');

    const ref = referenceId || `topup_${Date.now()}`;

    // Record credit transaction
    await dbPool.query(
      `INSERT INTO wallet_transactions (
        user_id, type, amount, balance_after, category, description, reference_id, status
      ) VALUES (?, 'credit', ?, ?, 'topup', ?, ?, 'success')`,
      [
        userId,
        numAmount,
        balanceAfter,
        `Wallet Topup via ${method}`,
        ref
      ]
    );

    return {
      wallet_balance: balanceAfter,
      amount_added: numAmount,
      reference_id: ref,
      created_at: new Date().toISOString(),
    };
  }
};

export default walletService;
