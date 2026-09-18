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

    // 9 logs from the screenshots (Thu, Sep 17, 2026):
    // 1. SNo. 59: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 1:07 PM IST -> UTC 07:37:50
    // 2. SNo. 45: Crif High Mark Credit Report V4 @ Thu, Sep 17, 2026, 1:19 PM IST -> UTC 07:49:15
    // 3. SNo. 42: statement-analyzer @ Thu, Sep 17, 2026, 1:21 PM IST -> UTC 07:51:40
    // 4. SNo. 40: statement-analyzer @ Thu, Sep 17, 2026, 1:22 PM IST -> UTC 07:52:25
    // 5. SNo. 24: statement-analyzer @ Thu, Sep 17, 2026, 2:14 PM IST -> UTC 08:44:10
    // 6. SNo. 6: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 2:47 PM IST -> UTC 09:17:30
    // 7. SNo. 5: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 2:48 PM IST -> UTC 09:18:15
    // 8. SNo. 4: Crif High Mark Credit Report V4 @ Thu, Sep 17, 2026, 2:48 PM IST -> UTC 09:18:45
    // 9. SNo. 3: Transunion Credit Report V5 @ Thu, Sep 17, 2026, 2:51 PM IST -> UTC 09:21:20

    const logsToInsert = [
      {
        sno: 59,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 1:07 PM',
        dateUtc: '2026-09-17 07:37:50',
        client_ref: 'TU_130750_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8820
      },
      {
        sno: 45,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 1:19 PM',
        dateUtc: '2026-09-17 07:49:15',
        client_ref: 'CRIF_131915_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        latency_ms: 1280
      },
      {
        sno: 42,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 1:21 PM',
        dateUtc: '2026-09-17 07:51:40',
        client_ref: 'STMT_132140_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1390
      },
      {
        sno: 40,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 1:22 PM',
        dateUtc: '2026-09-17 07:52:25',
        client_ref: 'STMT_132225_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1410
      },
      {
        sno: 24,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 2:14 PM',
        dateUtc: '2026-09-17 08:44:10',
        client_ref: 'STMT_141410_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1360
      },
      {
        sno: 6,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 2:47 PM',
        dateUtc: '2026-09-17 09:17:30',
        client_ref: 'TU_144730_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8960
      },
      {
        sno: 5,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 2:48 PM',
        dateUtc: '2026-09-17 09:18:15',
        client_ref: 'TU_144815_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9050
      },
      {
        sno: 4,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 2:48 PM',
        dateUtc: '2026-09-17 09:18:45',
        client_ref: 'CRIF_144845_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        latency_ms: 1310
      },
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 17, 2026, 2:51 PM',
        dateUtc: '2026-09-17 09:21:20',
        client_ref: 'TU_145120_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8880
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

    console.log('\n================ BATCH 19 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 19 insert:', err);
    process.exit(1);
  }
}

main();
