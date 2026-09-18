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

    // Fetch user credentials
    const [creds] = await dbPool.query('SELECT id FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1', [userId]);
    const credentialId = creds && creds.length > 0 ? creds[0].id : 3;

    // 9 logs from the screenshots (Fri, Sep 18, 2026):
    // 1. SNo. 3: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 12:07 PM IST -> UTC 06:37:30
    // 2. SNo. 7: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:56 AM IST -> UTC 06:26:45
    // 3. SNo. 8: statement-analyzer @ Fri, Sep 18, 2026, 11:56 AM IST -> UTC 06:26:10
    // 4. SNo. 9: Crif High Mark Credit Report V4 @ Fri, Sep 18, 2026, 11:54 AM IST -> UTC 06:24:50
    // 5. SNo. 10: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:53 AM IST -> UTC 06:23:40
    // 6. SNo. 13: Crif High Mark Credit Report V4 @ Fri, Sep 18, 2026, 11:54 AM IST -> UTC 06:24:15
    // 7. SNo. 14: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:53 AM IST -> UTC 06:23:10
    // 8. SNo. 19: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:51 AM IST -> UTC 06:21:25
    // 9. SNo. 25: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:48 AM IST -> UTC 06:18:30

    const logsToInsert = [
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 12:07 PM',
        dateUtc: '2026-09-18 06:37:30',
        client_ref: 'TU_120730_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8870
      },
      {
        sno: 7,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:56 AM',
        dateUtc: '2026-09-18 06:26:45',
        client_ref: 'TU_115645_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8920
      },
      {
        sno: 8,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:56 AM',
        dateUtc: '2026-09-18 06:26:10',
        client_ref: 'STMT_115610_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1390
      },
      {
        sno: 9,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:54 AM',
        dateUtc: '2026-09-18 06:24:50',
        client_ref: 'CRIF_115450_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1260
      },
      {
        sno: 10,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:53 AM',
        dateUtc: '2026-09-18 06:23:40',
        client_ref: 'TU_115340_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8810
      },
      {
        sno: 13,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:54 AM',
        dateUtc: '2026-09-18 06:24:15',
        client_ref: 'CRIF_115415_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1290
      },
      {
        sno: 14,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:53 AM',
        dateUtc: '2026-09-18 06:23:10',
        client_ref: 'TU_115310_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8950
      },
      {
        sno: 19,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:51 AM',
        dateUtc: '2026-09-18 06:21:25',
        client_ref: 'TU_115125_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8840
      },
      {
        sno: 25,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:48 AM',
        dateUtc: '2026-09-18 06:18:30',
        client_ref: 'TU_114830_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8900
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

    console.log('\n================ BATCH 25 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 25 insert:', err);
    process.exit(1);
  }
}

main();
