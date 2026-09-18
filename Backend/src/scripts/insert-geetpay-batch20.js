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

    // 8 logs from the screenshots (Thu, Sep 17, 2026):
    // Image 4:
    // 1. SNo. 96: statement-analyzer @ Thu, Sep 17, 2026, 12:20 PM IST -> UTC 06:50:20
    // 2. SNo. 94: statement-analyzer @ Thu, Sep 17, 2026, 12:20 PM IST -> UTC 06:50:45
    // 3. SNo. 93: statement-analyzer @ Thu, Sep 17, 2026, 12:21 PM IST -> UTC 06:51:30
    // Image 3:
    // 4. SNo. 90: Transunion Credit Report V5 (Dr) @ Thu, Sep 17, 2026, 12:35 PM IST -> UTC 07:05:25
    // 5. SNo. 89: Transunion Credit Report V5 (Cr - Reversal / Refund Complete) @ Thu, Sep 17, 2026, 12:36 PM IST -> UTC 07:06:15
    // Image 2:
    // 6. SNo. 86: Transunion Credit Report V5 (Dr) @ Thu, Sep 17, 2026, 12:37 PM IST -> UTC 07:07:40
    // Image 1:
    // 7. SNo. 75: Transunion Credit Report V5 (Dr) @ Thu, Sep 17, 2026, 12:53 PM IST -> UTC 07:23:15
    // 8. SNo. 72: Transunion Credit Report V5 (Dr) @ Thu, Sep 17, 2026, 12:58 PM IST -> UTC 07:28:30

    const logsToInsert = [
      {
        sno: 96,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:20 PM',
        dateUtc: '2026-09-17 06:50:20',
        client_ref: 'STMT_122020_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1380,
        is_reversal: false
      },
      {
        sno: 94,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:20 PM',
        dateUtc: '2026-09-17 06:50:45',
        client_ref: 'STMT_122045_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
        is_reversal: false
      },
      {
        sno: 93,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:21 PM',
        dateUtc: '2026-09-17 06:51:30',
        client_ref: 'STMT_122130_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1350,
        is_reversal: false
      },
      {
        sno: 90,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:35 PM',
        dateUtc: '2026-09-17 07:05:25',
        client_ref: 'TU_123525_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 89,
        name: 'Transunion Credit Report V5 (Reversal / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:36 PM',
        dateUtc: '2026-09-17 07:06:15',
        client_ref: 'TU_REFUND_123615_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - No charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1120,
        is_reversal: true
      },
      {
        sno: 86,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:37 PM',
        dateUtc: '2026-09-17 07:07:40',
        client_ref: 'TU_123740_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 75,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:53 PM',
        dateUtc: '2026-09-17 07:23:15',
        client_ref: 'TU_125315_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8780,
        is_reversal: false
      },
      {
        sno: 72,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 12:58 PM',
        dateUtc: '2026-09-17 07:28:30',
        client_ref: 'TU_125830_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8960,
        is_reversal: false
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
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${log.cost.toFixed(2)}${log.is_reversal ? ' (REFUND / NO DEDUCTION)' : ''}`);
    }

    // Deduct only non-reversal charges from wallet balance
    if (totalDeduction > 0) {
      await dbPool.query(
        'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
        [totalDeduction, userId]
      );
    }

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 20 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length} (including 1 Refunded Reversal Log)`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 20 insert:', err);
    process.exit(1);
  }
}

main();
