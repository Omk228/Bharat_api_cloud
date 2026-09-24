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

    // 8 logs from screenshots (Sat, Sep 19, 2026 late afternoon):
    // 1. SNo. 43: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 3:44 PM IST -> UTC 10:14:20
    // 2. SNo. 42: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 3:47 PM IST -> UTC 10:17:45
    // 3. SNo. 35: Transunion PDF V5 @ Sat, Sep 19, 2026, 3:52 PM IST -> UTC 10:22:15
    // 4. SNo. 28: Crif High Mark Credit Report V4 @ Sat, Sep 19, 2026, 3:56 PM IST -> UTC 10:26:40
    // 5. SNo. 27: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 3:57 PM IST -> UTC 10:27:10
    // 6. SNo. 24: Crif High Mark Credit Report V4 @ Sat, Sep 19, 2026, 4:03 PM IST -> UTC 10:33:15
    // 7. SNo. 23: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 4:03 PM IST -> UTC 10:33:45
    // 8. SNo. 11: Transunion Credit Report V5 @ Sat, Sep 19, 2026, 4:23 PM IST -> UTC 10:53:30

    const logsToInsert = [
      {
        sno: 43,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 3:44 PM',
        dateUtc: '2026-09-19 10:14:20',
        client_ref: 'TU_154420_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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
        ist_display: 'Sat, Sep 19, 2026, 3:47 PM',
        dateUtc: '2026-09-19 10:17:45',
        client_ref: 'TU_154745_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8910
      },
      {
        sno: 35,
        name: 'Transunion Credit Report V5 (PDF)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 3:52 PM',
        dateUtc: '2026-09-19 10:22:15',
        client_ref: 'TU_155215_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8860
      },
      {
        sno: 28,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 3:56 PM',
        dateUtc: '2026-09-19 10:26:40',
        client_ref: 'CRIF_155640_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1280
      },
      {
        sno: 27,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 3:57 PM',
        dateUtc: '2026-09-19 10:27:10',
        client_ref: 'TU_155710_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8950
      },
      {
        sno: 24,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 4:03 PM',
        dateUtc: '2026-09-19 10:33:15',
        client_ref: 'CRIF_160315_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1310
      },
      {
        sno: 23,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 4:03 PM',
        dateUtc: '2026-09-19 10:33:45',
        client_ref: 'TU_160345_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8890
      },
      {
        sno: 11,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 19, 2026, 4:23 PM',
        dateUtc: '2026-09-19 10:53:30',
        client_ref: 'TU_162330_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
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

    console.log('\n================ BATCH 34 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 34 insert:', err);
    process.exit(1);
  }
}

main();
