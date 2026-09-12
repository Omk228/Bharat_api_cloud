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
    console.log(`User ID: ${userId}, Starting Wallet Balance: ₹${user[0].wallet_balance}`);

    // Define the 7 logs after 4:37 PM from the screenshot
    const extraLogs = [
      {
        name: 'UAN to Employment History V2',
        endpoint: '/srv3/uan-direct',
        method: 'POST',
        ist_time: '2026-09-12 16:50:00', // 4:50 PM IST
        client_ref: 'UAN_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 4.48, // Base ₹3.80 + 18% GST
        latency_ms: 1210
      },
      {
        name: 'Mobile To Bank Advance',
        endpoint: '/srv3/mobile-to-bank/advance',
        method: 'POST',
        ist_time: '2026-09-12 16:51:00', // 4:51 PM IST
        client_ref: 'M2B_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 5.90, // Base ₹5.00 + 18% GST
        latency_ms: 1180
      },
      {
        name: 'Mobile to UPI Lookup Advance',
        endpoint: '/srv2/mobile-upi-lookup/enhanced',
        method: 'POST',
        ist_time: '2026-09-12 16:51:30', // 4:51 PM IST
        client_ref: 'UPI_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 3.30, // Base ₹2.80 + 18% GST
        latency_ms: 840
      },
      {
        name: 'UAN to Employment History V2',
        endpoint: '/srv3/uan-direct',
        method: 'POST',
        ist_time: '2026-09-12 17:08:00', // 5:08 PM IST
        client_ref: 'UAN_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 4.48, // Base ₹3.80 + 18% GST
        latency_ms: 1350
      },
      {
        name: 'Mobile To Bank Advance',
        endpoint: '/srv3/mobile-to-bank/advance',
        method: 'POST',
        ist_time: '2026-09-12 17:08:30', // 5:08 PM IST
        client_ref: 'M2B_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 5.90, // Base ₹5.00 + 18% GST
        latency_ms: 1140
      },
      {
        name: 'Mobile to UPI Lookup Advance',
        endpoint: '/srv2/mobile-upi-lookup/enhanced',
        method: 'POST',
        ist_time: '2026-09-12 17:09:00', // 5:09 PM IST
        client_ref: 'UPI_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 3.30, // Base ₹2.80 + 18% GST
        latency_ms: 920
      },
      {
        name: 'Mobile To Bank Advance',
        endpoint: '/srv3/mobile-to-bank/advance',
        method: 'POST',
        ist_time: '2026-09-12 17:09:30', // 5:09 PM IST
        client_ref: 'M2B_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 5.90, // Base ₹5.00 + 18% GST
        latency_ms: 1250
      }
    ];

    let totalDeduction = 0;

    for (const log of extraLogs) {
      const requestId = 'req_' + crypto.randomUUID();
      await dbPool.query(
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
          '103.175.61.18',
          log.cost,
          'production',
          log.ist_time
        ]
      );
      totalDeduction += log.cost;
      console.log(`[INSERTED] ${log.name} at ${log.ist_time} | ₹${log.cost}`);
    }

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    console.log(`[SUCCESS] Inserted ${extraLogs.length} logs. Total deduction: ₹${totalDeduction.toFixed(2)}. New wallet balance: ₹${updatedUser[0].wallet_balance}`);

    await dbPool.end();
  } catch (err) {
    console.error('Error inserting logs:', err);
    process.exit(1);
  }
}

main();
