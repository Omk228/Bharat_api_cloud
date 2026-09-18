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

    // 7 logs from screenshots (Fri, Sep 18, 2026):
    // 1. SNo. 33: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 11:18 AM IST -> UTC 05:48:35
    // 2. SNo. 55: Crif High Mark Credit Report V4 @ Fri, Sep 18, 2026, 10:48 AM IST -> UTC 05:18:20
    // 3. SNo. 58: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 10:47 AM IST -> UTC 05:17:45
    // 4. SNo. 65: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 10:40 AM IST -> UTC 05:10:15
    // 5. SNo. 66: Crif High Mark Credit Report V4 @ Fri, Sep 18, 2026, 10:32 AM IST -> UTC 05:02:50
    // 6. SNo. 67: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 10:31 AM IST -> UTC 05:01:40
    // 7. SNo. 68: Transunion Credit Report V5 @ Fri, Sep 18, 2026, 10:31 AM IST -> UTC 05:01:10

    const logsToInsert = [
      {
        sno: 33,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 11:18 AM',
        dateUtc: '2026-09-18 05:48:35',
        client_ref: 'TU_111835_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8890
      },
      {
        sno: 55,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:48 AM',
        dateUtc: '2026-09-18 05:18:20',
        client_ref: 'CRIF_104820_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1270
      },
      {
        sno: 58,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:47 AM',
        dateUtc: '2026-09-18 05:17:45',
        client_ref: 'TU_104745_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8830
      },
      {
        sno: 65,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:40 AM',
        dateUtc: '2026-09-18 05:10:15',
        client_ref: 'TU_104015_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8940
      },
      {
        sno: 66,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:32 AM',
        dateUtc: '2026-09-18 05:02:50',
        client_ref: 'CRIF_103250_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1280
      },
      {
        sno: 67,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:31 AM',
        dateUtc: '2026-09-18 05:01:40',
        client_ref: 'TU_103140_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8870
      },
      {
        sno: 68,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 18, 2026, 10:31 AM',
        dateUtc: '2026-09-18 05:01:10',
        client_ref: 'TU_103110_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8910
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

    console.log('\n================ BATCH 26 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 26 insert:', err);
    process.exit(1);
  }
}

main();
