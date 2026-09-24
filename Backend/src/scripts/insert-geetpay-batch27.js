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

    // 7 logs from screenshots (Fri, Sep 18, 2026 afternoon):
    // 1. SNo. 22: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 2:56 PM IST -> UTC 09:26:40
    // 2. SNo. 29: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 2:22 PM IST -> UTC 08:52:15
    // 3. SNo. 37: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 1:58 PM IST -> UTC 08:28:30
    // 4. SNo. 42: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 1:51 PM IST -> UTC 08:21:45
    // 5. SNo. 48: statement-analyzer @ Fri, Sep 18, 2026, 1:45 PM IST -> UTC 08:15:20
    // 6. SNo. 49: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 1:40 PM IST -> UTC 08:10:45
    // 7. SNo. 50: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 1:40 PM IST -> UTC 08:10:10

    const logsToInsert = [
      {
        sno: 22,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 2:56 PM',
        dateUtc: '2026-09-18 09:26:40',
        client_ref: 'TU_145640_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8880
      },
      {
        sno: 29,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 2:22 PM',
        dateUtc: '2026-09-18 08:52:15',
        client_ref: 'TU_142215_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8910
      },
      {
        sno: 37,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 1:58 PM',
        dateUtc: '2026-09-18 08:28:30',
        client_ref: 'TU_135830_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8840
      },
      {
        sno: 42,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 1:51 PM',
        dateUtc: '2026-09-18 08:21:45',
        client_ref: 'TU_135145_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8930
      },
      {
        sno: 48,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 1:45 PM',
        dateUtc: '2026-09-18 08:15:20',
        client_ref: 'STMT_134520_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1380
      },
      {
        sno: 49,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 1:40 PM',
        dateUtc: '2026-09-18 08:10:45',
        client_ref: 'TU_134045_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8870
      },
      {
        sno: 50,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 1:40 PM',
        dateUtc: '2026-09-18 08:10:10',
        client_ref: 'TU_134010_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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

    console.log('\n================ BATCH 27 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 27 insert:', err);
    process.exit(1);
  }
}

main();
