import 'dotenv/config';
import { dbPool } from 'file:///C:/Users/Om Kumar Jha/Desktop/Bharat_api_cloud/Backend/src/core/config/db.config.js';
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

    // 3 logs from the user screenshots (Thu, Sep 17, 2026):
    // 1. SNo. 71: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 10:21 AM IST -> UTC 04:51:25
    // 2. SNo. 20: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 11:52 AM IST -> UTC 06:22:40
    // 3. SNo. 10: statement-analyzer @ Thu, Sep 17, 2026, 11:57 AM IST -> UTC 06:27:35

    const logsToInsert = [
      {
        sno: 71,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 10:21 AM',
        dateUtc: '2026-09-17 04:51:25',
        client_ref: 'TU_102125_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Platform Pricing: Base ₹75.00 + 18% GST
        latency_ms: 8840
      },
      {
        sno: 20,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 11:52 AM',
        dateUtc: '2026-09-17 06:22:40',
        client_ref: 'TU_115240_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Platform Pricing: Base ₹75.00 + 18% GST
        latency_ms: 8920
      },
      {
        sno: 10,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 11:57 AM',
        dateUtc: '2026-09-17 06:27:35',
        client_ref: 'STMT_115735_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Platform Pricing: Base ₹25.00 + 18% GST
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
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Platform Cost: ₹${log.cost.toFixed(2)}`);
    }

    // Deduct from wallet balance according to platform pricing
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [totalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 18 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 18 insert:', err);
    process.exit(1);
  }
}

main();
