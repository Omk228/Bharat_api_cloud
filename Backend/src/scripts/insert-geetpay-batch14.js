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

    // Logs from the provided screenshots for Wed, Sep 16, 2026:
    // 1. SNo. 76 (Image 3): Transunion Credit Report V5 @ Wed, Sep 16, 2026, 11:13 AM IST -> UTC 05:43:25
    // 2. SNo. 57 (Image 2): statement-analyzer @ Wed, Sep 16, 2026, 11:44 AM IST -> UTC 06:14:15
    // 3. SNo. 54 (Image 2): Transunion Credit Report V5 @ Wed, Sep 16, 2026, 11:49 AM IST -> UTC 06:19:20
    // 4. SNo. 52 / 50 (Image 2 & 1): Transunion Credit Report V5 @ Wed, Sep 16, 2026, 11:53 AM IST -> UTC 06:23:15

    const logsToInsert = [
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 16, 2026, 11:13 AM',
        dateUtc: '2026-09-16 05:43:25',
        client_ref: 'TU_111325_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8920
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 16, 2026, 11:44 AM',
        dateUtc: '2026-09-16 06:14:15',
        client_ref: 'STMT_114415_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1380
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 16, 2026, 11:49 AM',
        dateUtc: '2026-09-16 06:19:20',
        client_ref: 'TU_114920_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9050
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 16, 2026, 11:53 AM',
        dateUtc: '2026-09-16 06:23:15',
        client_ref: 'TU_115315_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8870
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

    console.log('\n================ BATCH 14 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 14 insert:', err);
    process.exit(1);
  }
}

main();
