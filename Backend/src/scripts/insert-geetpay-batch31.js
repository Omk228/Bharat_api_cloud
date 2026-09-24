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

    // Fetch user credentials
    const [creds] = await dbPool.query('SELECT id FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1', [userId]);
    const credentialId = creds && creds.length > 0 ? creds[0].id : 3;

    // 6 logs from screenshots (Sat, Sep 19, 2026):
    // 1. SNo. 44: statement-analyzer @ Sat, Sep 19, 2026, 11:30 AM IST -> UTC 06:00:15
    // 2. SNo. 41: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 11:35 AM IST -> UTC 06:05:40
    // 3. SNo. 28: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 11:48 AM IST -> UTC 06:18:25
    // 4. SNo. 12: statement-analyzer @ Sat, Sep 19, 2026, 12:09 PM IST -> UTC 06:39:30
    // 5. SNo. 4: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 12:13 PM IST -> UTC 06:43:20
    // 6. SNo. 3: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 12:19 PM IST -> UTC 06:49:45

    const logsToInsert = [
      {
        sno: 44,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 11:30 AM',
        dateUtc: '2026-09-19 06:00:15',
        client_ref: 'STMT_113015_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1410
      },
      {
        sno: 41,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 11:35 AM',
        dateUtc: '2026-09-19 06:05:40',
        client_ref: 'TU_113540_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8870
      },
      {
        sno: 28,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 11:48 AM',
        dateUtc: '2026-09-19 06:18:25',
        client_ref: 'TU_114825_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8920
      },
      {
        sno: 12,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 12:09 PM',
        dateUtc: '2026-09-19 06:39:30',
        client_ref: 'STMT_120930_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1390
      },
      {
        sno: 4,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 12:13 PM',
        dateUtc: '2026-09-19 06:43:20',
        client_ref: 'TU_121320_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8840
      },
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 12:19 PM',
        dateUtc: '2026-09-19 06:49:45',
        client_ref: 'TU_121945_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8890
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
          credentialId,
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
      totalDeduction += log.cost;
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${log.cost.toFixed(2)}`);
    }

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 31 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 31 insert:', err);
    process.exit(1);
  }
}

main();
