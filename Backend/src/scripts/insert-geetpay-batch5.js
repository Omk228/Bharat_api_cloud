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

    // Three logs from screenshot:
    // 1. Mon, Sep 14, 2026, 3:31 PM IST -> UTC 10:01:30 (Transunion)
    // 2. Mon, Sep 14, 2026, 3:32 PM IST -> UTC 10:02:15 (Statement Analyzer)
    // 3. Mon, Sep 14, 2026, 4:38 PM IST -> UTC 11:08:30 (CRIF High Mark)
    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 3:31 PM',
        dateUtc: '2026-09-14 10:01:30',
        client_ref: 'TU_153100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8960
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 3:32 PM',
        dateUtc: '2026-09-14 10:02:15',
        client_ref: 'STMT_153200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1340
      },
      {
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 4:38 PM',
        dateUtc: '2026-09-14 11:08:30',
        client_ref: 'CRIF_163800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        latency_ms: 1290
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

    console.log('\n================ BATCH 5 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Updated Wallet Balance: ₹${parseFloat(updatedUser[0].wallet_balance).toFixed(2)}`);
    console.log('===================================================================\n');

    // Display sequence
    const [allLogs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at
       FROM api_hit_logs
       WHERE user_id = ? AND created_at >= '2026-09-14 09:50:00' AND created_at <= '2026-09-14 11:15:00'
       ORDER BY created_at ASC`,
      [userId]
    );

    console.log('--- Hit Logs Sequence in Timeframe (3:20 PM - 4:45 PM IST) ---');
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
    console.error('Error inserting logs:', err);
    process.exit(1);
  }
}

main();
