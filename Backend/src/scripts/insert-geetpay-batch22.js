import 'dotenv/config';
import { dbPool } from 'file:///C:/Users/Om Kumar Jha/Desktop/Bharat_api_cloud/Backend/src/core/config/db.config.js';
import crypto from 'node:crypto';

async function main() {
  try {
    const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
    if (!user || user.length === 0) {
      console.error('User not found: loan@geetpay.in');
      process.exit(1);
    }
    const userId = user[0].id;
    const startingBalance = parseFloat(user[0].wallet_balance);
    console.log(`User ID: ${userId}, Email: ${user[0].email}, Starting Wallet Balance: ₹${startingBalance.toFixed(2)}`);

    // 1 Transunion log from screenshot (Thu, Sep 17, 2026):
    // SNo. 7: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 4:51 PM IST -> UTC 11:21:30

    const log = {
      sno: 7,
      name: 'Transunion Credit Report V5',
      endpoint: '/srv5/transunion-Score-Hybrid',
      method: 'POST',
      ist_display: 'Thu, Sep 17, 2026, 4:51 PM',
      dateUtc: '2026-09-17 11:21:30',
      client_ref: 'TU_165130_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
      status_code: 200,
      result_code: 101,
      latency_ms: 8910
    };

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
        log.status_code,
        log.result_code,
        log.latency_ms,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        log.cost,
        'sandbox',
        log.dateUtc
      ]
    );

    console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${log.cost.toFixed(2)}`);

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [log.cost, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 22 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: 1`);
    console.log(`Total Deducted from Wallet: -₹${log.cost.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 22 insert:', err);
    process.exit(1);
  }
}

main();
