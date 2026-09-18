import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
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

    // 1 Transunion Credit Report V5 log from the screenshot:
    // SNo. 6: Wed, Sep 16, 2026, 4:23 PM IST -> UTC 10:53:25
    const log = {
      name: 'Transunion Credit Report V5',
      endpoint: '/srv5/transunion-Score-Hybrid',
      method: 'POST',
      ist_display: 'Wed, Sep 16, 2026, 4:23 PM',
      dateUtc: '2026-09-16 10:53:25',
      client_ref: 'TU_162325_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
      latency_ms: 8940
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
        200,
        101,
        log.latency_ms,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        log.cost,
        'sandbox',
        log.dateUtc
      ]
    );

    console.log(`[INSERTED ID: ${res.insertId}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Platform Cost: ₹${log.cost.toFixed(2)}`);

    // Deduct from wallet balance according to platform pricing
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [log.cost, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 17 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: 1`);
    console.log(`Total Deducted from Wallet: -₹${log.cost.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 17 insert:', err);
    process.exit(1);
  }
}

main();
