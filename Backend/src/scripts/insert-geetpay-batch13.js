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

    // 8 logs from the screenshots (SNo 132 and 133 were already inserted in Batch 12):
    // Image 3:
    // 1. SNo. 104: Crif High Mark Credit Report V4 @ Tue, Sep 15, 2026, 5:20 PM IST -> UTC 11:50:30
    // Image 2:
    // 2. SNo. 66: statement-analyzer @ Tue, Sep 15, 2026, 6:23 PM IST -> UTC 12:53:45
    // 3. SNo. 62: statement-analyzer @ Tue, Sep 15, 2026, 6:27 PM IST -> UTC 12:57:10
    // Image 1:
    // 4. SNo. 57: statement-analyzer @ Tue, Sep 15, 2026, 6:36 PM IST -> UTC 13:06:20
    // 5. SNo. 54: Transunion Credit Report V5 @ Tue, Sep 15, 2026, 7:03 PM IST -> UTC 13:33:40
    // 6. SNo. 53: Transunion Credit Report V5 @ Tue, Sep 15, 2026, 7:37 PM IST -> UTC 14:07:15
    // 7. SNo. 52: Transunion Credit Report V5 @ Tue, Sep 15, 2026, 7:38 PM IST -> UTC 14:08:25
    // 8. SNo. 51: Transunion Credit Report V5 @ Tue, Sep 15, 2026, 7:39 PM IST -> UTC 14:09:35

    const logsToInsert = [
      {
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 5:20 PM',
        dateUtc: '2026-09-15 11:50:30',
        client_ref: 'CRIF_172030_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 35.40, // Base ₹30.00 + 18% GST (Platform Pricing)
        latency_ms: 1290
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 6:23 PM',
        dateUtc: '2026-09-15 12:53:45',
        client_ref: 'STMT_182345_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1340
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 6:27 PM',
        dateUtc: '2026-09-15 12:57:10',
        client_ref: 'STMT_182710_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1410
      },
      {
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 6:36 PM',
        dateUtc: '2026-09-15 13:06:20',
        client_ref: 'STMT_183620_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 29.50, // Base ₹25.00 + 18% GST (Platform Pricing)
        latency_ms: 1360
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 7:03 PM',
        dateUtc: '2026-09-15 13:33:40',
        client_ref: 'TU_190340_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9120
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 7:37 PM',
        dateUtc: '2026-09-15 14:07:15',
        client_ref: 'TU_193715_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8850
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 7:38 PM',
        dateUtc: '2026-09-15 14:08:25',
        client_ref: 'TU_193825_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 8970
      },
      {
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 15, 2026, 7:39 PM',
        dateUtc: '2026-09-15 14:09:35',
        client_ref: 'TU_193935_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 88.50, // Base ₹75.00 + 18% GST (Platform Pricing)
        latency_ms: 9030
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

    console.log('\n================ BATCH 13 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 13 insert:', err);
    process.exit(1);
  }
}

main();
