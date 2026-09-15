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

    // Logs to insert from the provided screenshots:
    // 1. Mon, Sep 14, 2026, 6:13 PM IST -> UTC 12:43:15 (Transunion Credit Report V5 - Row 43)
    // 2. Tue, Sep 15, 2026, 10:58 AM IST -> UTC 05:28:15 (statement-analyzer - Row 6)
    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 14, 2026, 6:13 PM',
        dateUtc: '2026-09-14 12:43:15',
        client_ref: 'TU_181300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8890
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 10:58 AM',
        dateUtc: '2026-09-15 05:28:15',
        client_ref: 'STMT_105800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1350
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

    console.log('\n================ BATCH 7 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('===================================================================\n');

    // Display sequence around Mon Sep 14, 6:00 PM - 6:40 PM IST
    const [sep14Logs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at
       FROM api_hit_logs
       WHERE user_id = ? AND created_at >= '2026-09-14 12:30:00' AND created_at <= '2026-09-14 13:10:00'
       ORDER BY created_at ASC`,
      [userId]
    );

    console.log('--- Hit Logs Sequence around Mon Sep 14, 6:00 PM - 6:40 PM IST ---');
    sep14Logs.forEach((l) => {
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

    // Display sequence around Tue Sep 15, 10:50 AM - 11:05 AM IST
    const [sep15Logs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at
       FROM api_hit_logs
       WHERE user_id = ? AND created_at >= '2026-09-15 05:20:00' AND created_at <= '2026-09-15 05:35:00'
       ORDER BY created_at ASC`,
      [userId]
    );

    console.log('\n--- Hit Logs Sequence around Tue Sep 15, 10:50 AM - 11:05 AM IST ---');
    sep15Logs.forEach((l) => {
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
    console.error('Error executing batch insert:', err);
    process.exit(1);
  }
}

main();
