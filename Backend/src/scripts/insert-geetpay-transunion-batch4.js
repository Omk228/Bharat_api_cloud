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
    console.log(`User ID: ${userId}, Email: ${user[0].email}, Starting Wallet Balance: ₹${user[0].wallet_balance}`);

    // Two TransUnion logs from screenshot:
    // 1. Mon, Sep 14, 2026, 2:37 PM IST -> UTC 09:07:20
    // 2. Mon, Sep 14, 2026, 2:39 PM IST -> UTC 09:09:15
    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 2:37 PM',
        dateUtc: '2026-09-14 09:07:20',
        client_ref: 'TU_143700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9140
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 2:39 PM',
        dateUtc: '2026-09-14 09:09:15',
        client_ref: 'TU_143900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8820
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
      console.log(`[INSERTED ID: ${res.insertId}] ${log.name} at IST ${log.ist_display} | Cost: ₹${log.cost.toFixed(2)}`);
    }

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);

    console.log('\n================ TRANSUNION BATCH INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Updated Wallet Balance: ₹${parseFloat(updatedUser[0].wallet_balance).toFixed(2)}`);
    console.log('============================================================================\n');

    // Display the sequence of logs from 2:30 PM to 2:55 PM
    const [allLogs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at
       FROM api_hit_logs
       WHERE user_id = ? AND created_at >= '2026-09-14 09:00:00' AND created_at <= '2026-09-14 09:25:00'
       ORDER BY created_at ASC`,
      [userId]
    );

    console.log('--- Hit Logs Sequence around that timeframe ---');
    allLogs.forEach((l) => {
      const istString = new Date(l.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      console.log(`[ID ${l.id}] ${istString} | ${l.endpoint.padEnd(35)} | ₹${parseFloat(l.cost).toFixed(2)}`);
    });

    await dbPool.end();
  } catch (err) {
    console.error('Error inserting TransUnion logs:', err);
    process.exit(1);
  }
}

main();
