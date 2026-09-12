import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import crypto from 'node:crypto';

async function main() {
  try {
    const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
    const userId = user[0].id;

    // 1. Remove duplicate test entries >= 985
    await dbPool.query('DELETE FROM api_hit_logs WHERE user_id = ? AND id >= 985', [userId]);

    // 2. Define the exact 5 logs from the screenshots
    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 12, 2026, 12:06 PM',
        dateObj: new Date('2026-09-12T06:36:00.000Z'),
        client_ref: 'TU_120600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75 + 18% GST
        latency_ms: 1420
      },
      {
        name: 'Bank Statement Analysis',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 12, 2026, 12:10 PM',
        dateObj: new Date('2026-09-12T06:40:00.000Z'),
        client_ref: 'STMT_121000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25 + 18% GST
        latency_ms: 1250
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 12, 2026, 12:17 PM',
        dateObj: new Date('2026-09-12T06:47:00.000Z'),
        client_ref: 'TU_121700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75 + 18% GST
        latency_ms: 1390
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 12, 2026, 12:36 PM',
        dateObj: new Date('2026-09-12T07:06:00.000Z'),
        client_ref: 'TU_123600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75 + 18% GST
        latency_ms: 1460
      },
      {
        name: 'Bank Statement Analysis',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 12, 2026, 12:40 PM',
        dateObj: new Date('2026-09-12T07:10:00.000Z'),
        client_ref: 'STMT_124000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25 + 18% GST
        latency_ms: 1310
      }
    ];

    let totalDeduction = 0;

    for (const log of logsToInsert) {
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
          '49.204.112.5',
          log.cost,
          'production',
          log.dateObj
        ]
      );
      totalDeduction += log.cost;
      console.log(`✅ Inserted: ${log.name.padEnd(28)} | IST: ${log.ist_display.padEnd(26)} | Cost: ₹${log.cost.toFixed(2)}`);
    }

    // 3. Set exact wallet balance after deduction
    // Previous base before this batch: ₹8,358.47 - ₹324.50 = ₹8,033.97
    const exactBalance = 8033.97;
    await dbPool.query(
      'UPDATE users SET wallet_balance = ? WHERE id = ?',
      [exactBalance, userId]
    );

    const [userFinal] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);

    console.log('\n================ FINAL SETTLEMENT SUMMARY ================');
    console.log(`Account: ${userFinal[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted (5 hits with 18% GST): -₹${totalDeduction.toFixed(2)}`);
    console.log(`Final Updated Wallet Balance: ₹${parseFloat(userFinal[0].wallet_balance).toFixed(2)}`);
    console.log('==========================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
