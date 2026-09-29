import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import { PricingService } from '../modules/pricing/pricing.service.js';
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

    // Platform prices (custom price + 18% GST)
    const priceTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId); // 88.50 (Base ₹75.00 + 18% GST)
    const priceCrif = await PricingService.getEffectivePrice('/crif/Credit-ScoreV4', userId); // 35.40 (Base ₹30.00 + 18% GST)
    const priceStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId); // 29.50 (Base ₹25.00 + 18% GST)

    console.log(`\nPlatform Pricing for loan@geetpay.in:`);
    console.log(`- TransUnion CIBIL V5 (/srv5/transunion-Score-Hybrid): ₹${priceTU.toFixed(2)}`);
    console.log(`- CRIF High Mark V4 (/crif/Credit-ScoreV4): ₹${priceCrif.toFixed(2)}`);
    console.log(`- Statement Analyzer V2 (/srv2/statement-analyzer): ₹${priceStmt.toFixed(2)}`);

    // Logs to insert from user screenshots (Mon, Sep 28, 2026):
    // Image 1:
    // 1. SNo. 1:  statement-analyzer (Dr) @ Mon, Sep 28, 2026, 2:21 PM IST -> UTC 2026-09-28 08:51:00
    // 2. SNo. 10: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 1:28 PM IST -> UTC 2026-09-28 07:58:00
    // Image 2:
    // 3. SNo. 13: statement-analyzer (Dr) @ Mon, Sep 28, 2026, 1:01 PM IST -> UTC 2026-09-28 07:31:00
    // Image 3:
    // 4. SNo. 29: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 11:38 AM IST -> UTC 2026-09-28 06:08:00
    // Image 4:
    // 5. SNo. 31: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 11:28 AM IST -> UTC 2026-09-28 05:58:00
    // 6. SNo. 35: statement-analyzer (Dr) @ Mon, Sep 28, 2026, 11:07 AM IST -> UTC 2026-09-28 05:37:00
    // 7. SNo. 36: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 11:07 AM IST -> UTC 2026-09-28 05:37:00
    // Image 5:
    // 8. SNo. 47: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 10:33 AM IST -> UTC 2026-09-28 05:03:00

    const logsToInsert = [
      {
        sno: 47,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 10:33 AM',
        dateUtc: '2026-09-28 05:03:00',
        client_ref: 'TU_103300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8640,
        is_reversal: false
      },
      {
        sno: 36,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 11:07 AM',
        dateUtc: '2026-09-28 05:37:00',
        client_ref: 'TU_110700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 35,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 11:07 AM',
        dateUtc: '2026-09-28 05:37:00',
        client_ref: 'STMT_110700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1520,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 11:28 AM',
        dateUtc: '2026-09-28 05:58:00',
        client_ref: 'TU_112800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8750,
        is_reversal: false
      },
      {
        sno: 29,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 11:38 AM',
        dateUtc: '2026-09-28 06:08:00',
        client_ref: 'TU_113800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 9020,
        is_reversal: false
      },
      {
        sno: 13,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 1:01 PM',
        dateUtc: '2026-09-28 07:31:00',
        client_ref: 'STMT_130100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 10,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 1:28 PM',
        dateUtc: '2026-09-28 07:58:00',
        client_ref: 'TU_132800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 1,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 2:21 PM',
        dateUtc: '2026-09-28 08:51:00',
        client_ref: 'STMT_142100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1540,
        is_reversal: false
      }
    ];

    let totalDeduction = 0;
    const insertedRecords = [];

    for (const log of logsToInsert) {
      const actualDeductionCost = log.is_reversal ? 0.00 : log.cost;
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
          actualDeductionCost,
          'production',
          log.dateUtc
        ]
      );
      totalDeduction += actualDeductionCost;
      insertedRecords.push({
        id: res.insertId,
        sno: log.sno,
        name: log.name,
        endpoint: log.endpoint,
        ist: log.ist_display,
        utc: log.dateUtc,
        cost: `₹${actualDeductionCost.toFixed(2)}`,
        is_reversal: log.is_reversal
      });
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Platform Cost: ₹${actualDeductionCost.toFixed(2)}${log.is_reversal || actualDeductionCost === 0 ? ' (REFUND / REVERSAL - ZERO WALLET DEDUCTION)' : ''}`);
    }

    // Deduct non-reversal charges from wallet balance
    if (totalDeduction > 0) {
      await dbPool.query(
        'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
        [totalDeduction, userId]
      );
    }

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 81 INSERT & WALLET SETTLEMENT ================');
    console.log(`User: ${updatedUser[0].email} (ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length}`);
    console.log(`Starting Wallet Balance: ₹${startingBalance.toFixed(2)}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Final Updated Wallet Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('=======================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error in batch 81 execution:', err);
    process.exit(1);
  }
}

main();
