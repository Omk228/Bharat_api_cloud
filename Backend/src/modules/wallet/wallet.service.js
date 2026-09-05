import { dbPool } from '../../core/config/db.config.js';
import { ApiError } from '../../core/utils/apiError.js';
import CacheService from '../../core/cache/cache.service.js';

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

    return {
      wallet_balance: balance,
      today_spend: todaySpend,
      month_spend: monthSpend,
      total_hits: totalHits,
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
      SELECT id, user_id, type, amount, balance_after, category, description, reference_id, created_at
      FROM wallet_transactions
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type && (type === 'credit' || type === 'debit')) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search && search.trim()) {
      query += ' AND (description LIKE ? OR reference_id LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await dbPool.query(query, params);

    // Format for frontend consumption
    return rows.map((row) => ({
      id: `tx_${row.id}`,
      type: row.type,
      amount: parseFloat(row.amount),
      balance_after: parseFloat(row.balance_after),
      category: row.category,
      description: row.description,
      reference_id: row.reference_id || `ref_${row.id}`,
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

    return rows.map((row) => {
      let group = 'KYC';
      if (row.endpoint.includes('idfc') || row.endpoint.includes('bank')) group = 'Banking';
      else if (row.endpoint.includes('prefill') || row.endpoint.includes('credit-report')) group = 'KYC';
      else if (row.endpoint.includes('pan') || row.endpoint.includes('aadhar')) group = 'KYC';

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
        user_id, type, amount, balance_after, category, description, reference_id
      ) VALUES (?, 'credit', ?, ?, 'topup', ?, ?)`,
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
