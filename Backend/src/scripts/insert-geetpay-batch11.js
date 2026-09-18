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

    // 2 Transunion Credit Report V5 logs from the screenshot (SNo 5 and SNo 2):
    // 1. SNo. 5: Tue, Sep 15, 2026, 4:44 PM IST -> UTC 11:14:30
    // 2. SNo. 2: Tue, Sep 15, 2026, 4:47 PM IST -> UTC 11:17:20
    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 4:44 PM',
        dateUtc: '2026-09-15 11:14:30',
        client_ref: 'TU_164430_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8940
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 4:47 PM',
        dateUtc: '2026-09-15 11:17:20',
        client_ref: 'TU_164720_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9110
      }
    ];

    let totalDeduction = 0;

    for (const log of logsToInsert) {
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
      console.log(`[INSERTED ID: ${res.insertId}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Platform Cost: ₹${log.cost.toFixed(2)}`);
    }

    // Deduct from wallet balance according to platform pricing
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 11 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 11 insert:', err);
    process.exit(1);
  }
}

main();
