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

    // 1. Sync 1385 timestamp to 12:43 PM IST (UTC 07:13:20) so Row 10 is perfectly mapped
    await dbPool.query(
      `UPDATE api_hit_logs 
       SET created_at = '2026-09-14 07:13:20' 
       WHERE id = 1385 AND user_id = ?`,
      [userId]
    );
    console.log('✅ Synced Log #1385 to 12:43:20 PM IST (Row 10)');

    // 2. Define the missing logs to insert
    const logsToInsert = [
      {
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 12:16 PM',
        dateUtc: '2026-09-14 06:46:30', // 12:16:30 PM IST (Row 20)
        client_ref: 'CRIF_121600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        latency_ms: 1280
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 12:39 PM',
        dateUtc: '2026-09-14 07:09:15', // 12:39:15 PM IST (Row 11)
        client_ref: 'STMT_123900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1350
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 1:06 PM',
        dateUtc: '2026-09-14 07:36:15', // 01:06:15 PM IST (Row 8)
        client_ref: 'TU_130600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8920
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

    // 3. Deduct total amount from user wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);

    console.log('\n================ BATCH INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Updated Wallet Balance: ₹${parseFloat(updatedUser[0].wallet_balance).toFixed(2)}`);
    console.log('==================================================================\n');

    // Display the sequence of logs from 12:15 PM to 1:15 PM
    const [allLogs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at
       FROM api_hit_logs
       WHERE user_id = ? AND created_at >= '2026-09-14 06:45:00' AND created_at <= '2026-09-14 07:42:00'
       ORDER BY created_at DESC, id DESC
       LIMIT 25`,
      [userId]
    );

    console.log('--- Top 20 Hit Logs in Timeframe ---');
    allLogs.forEach((l, idx) => {
      const istString = new Date(l.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      console.log(`${(idx + 1).toString().padStart(2)}. [ID ${l.id}] ${istString} | ${l.endpoint.padEnd(35)} | ₹${parseFloat(l.cost).toFixed(2)}`);
    });

    await dbPool.end();
  } catch (err) {
    console.error('Error in batch script:', err);
    process.exit(1);
  }
}

main();
