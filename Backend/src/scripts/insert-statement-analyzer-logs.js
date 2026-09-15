import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import crypto from 'node:crypto';

async function main() {
  try {
    const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
    if (!user || user.length === 0) {
      console.error('User not found');
      process.exit(1);
    }
    const userId = user[0].id;
    console.log(`User ID: ${userId}, Email: ${user[0].email}, Current Wallet Balance: ₹${user[0].wallet_balance}`);

    // Two Statement Analyzer logs from screenshot:
    // 1. Mon, Sep 14, 2026, 11:53 AM IST -> UTC 06:23:18
    // 2. Mon, Sep 14, 2026, 12:05 PM IST -> UTC 06:35:12
    const statementLogs = [
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 11:53 AM',
        dateUtc: '2026-09-14 06:23:18',
        client_ref: 'STMT_115300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 17.70,
        latency_ms: 1320
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 12:05 PM',
        dateUtc: '2026-09-14 06:35:12',
        client_ref: 'STMT_120500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 17.70,
        latency_ms: 1410
      }
    ];

    let totalDeduction = 0;

    for (const log of statementLogs) {
      const requestId = 'req_' + crypto.randomUUID();
      const [res] = await dbPool.query(
        `INSERT INTO api_hit_logs (
          user_id, credential_id, endpoint, method, request_id,
          client_ref_num, status_code, result_code, latency_ms,
          client_ip, cost, environment, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          3,
          log.endpoint,
          log.method,
          requestId,
          log.client_ref,
          200,
          101,
          log.latency_ms,
          '103.234.186.75, 103.234.186.75,103.234.186.75',
          log.cost,
          'sandbox',
          log.dateUtc
        ]
      );
      totalDeduction += log.cost;
      console.log(`[INSERTED ID: ${res.insertId}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | ₹${log.cost.toFixed(2)}`);
    }

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    console.log(`\nSuccessfully inserted ${statementLogs.length} statement analyzer logs.`);
    console.log(`Total Deducted: -₹${totalDeduction.toFixed(2)} | Updated Wallet Balance: ₹${updatedUser[0].wallet_balance}`);

    await dbPool.end();
  } catch (err) {
    console.error('Error inserting statement analyzer logs:', err);
    process.exit(1);
  }
}

main();
