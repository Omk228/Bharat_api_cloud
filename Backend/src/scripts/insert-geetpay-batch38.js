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

    // 6 logs from screenshots (Transunion, CRIF High Mark, Statement Analyzer)
    // 1. SNo. 38: Transunion Credit Report V5 @ Mon, Sep 21, 2026, 11:20 AM IST -> UTC 2026-09-21 05:50:00 (₹88.50)
    // 2. SNo. 37: CRIF High Mark Credit Score V4 @ Mon, Sep 21, 2026, 11:21 AM IST -> UTC 2026-09-21 05:51:00 (₹35.40)
    // 3. SNo. 26: Transunion Credit Report V5 @ Mon, Sep 21, 2026, 11:41 AM IST -> UTC 2026-09-21 06:11:00 (₹88.50)
    // 4. SNo. 25: CRIF High Mark Credit Score V4 @ Mon, Sep 21, 2026, 11:41 AM IST -> UTC 2026-09-21 06:11:30 (₹35.40)
    // 5. SNo. 4: statement-analyzer @ Mon, Sep 21, 2026, 12:08 PM IST -> UTC 2026-09-21 06:38:00 (₹29.50)
    // 6. SNo. 1: Transunion Credit Report V5 @ Mon, Sep 21, 2026, 12:11 PM IST -> UTC 2026-09-21 06:41:00 (₹88.50)

    const logsToInsert = [
      {
        sno: 38,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 11:20 AM',
        dateUtc: '2026-09-21 05:50:00',
        client_ref: 'TU_112000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8840
      },
      {
        sno: 37,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 11:21 AM',
        dateUtc: '2026-09-21 05:51:00',
        client_ref: 'CRIF_112100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1290
      },
      {
        sno: 26,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 11:41 AM',
        dateUtc: '2026-09-21 06:11:00',
        client_ref: 'TU_114100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 8870
      },
      {
        sno: 25,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 11:41 AM',
        dateUtc: '2026-09-21 06:11:30',
        client_ref: 'CRIF_114130_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1310
      },
      {
        sno: 4,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 12:08 PM',
        dateUtc: '2026-09-21 06:38:00',
        client_ref: 'STMT_120800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        status_code: 200,
        result_code: 101,
        latency_ms: 1410
      },
      {
        sno: 1,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 12:11 PM',
        dateUtc: '2026-09-21 06:41:00',
        client_ref: 'TU_121100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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
          'production',
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

    console.log('\n================ BATCH 38 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 38 insert:', err);
    process.exit(1);
  }
}

main();
