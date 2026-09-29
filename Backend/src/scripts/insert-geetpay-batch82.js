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

    // Logs to insert from user screenshots:
    // Image 5:
    // 1. SNo. 124: Transunion Credit Report V5 (Dr) @ Sun, Sep 27, 2026, 4:48 PM IST -> UTC 2026-09-27 11:18:00
    // 2. SNo. 122: Transunion Credit Report V5 (Dr) @ Sun, Sep 27, 2026, 5:22 PM IST -> UTC 2026-09-27 11:52:00
    // Image 4:
    // 3. SNo. 117: Transunion Credit Report V5 (Dr) @ Sun, Sep 27, 2026, 5:33 PM IST -> UTC 2026-09-27 12:03:00
    // 4. SNo. 115: statement-analyzer (Dr) @ Sun, Sep 27, 2026, 5:42 PM IST -> UTC 2026-09-27 12:12:00
    // Image 3:
    // 5. SNo. 106: statement-analyzer (Dr) @ Sun, Sep 27, 2026, 5:58 PM IST -> UTC 2026-09-27 12:28:00
    // Image 2:
    // 6. SNo. 98:  statement-analyzer (Dr) @ Sun, Sep 27, 2026, 6:25 PM IST -> UTC 2026-09-27 12:55:00
    // 7. SNo. 97:  statement-analyzer (Dr) @ Sun, Sep 27, 2026, 6:36 PM IST -> UTC 2026-09-27 13:06:00
    // Image 1:
    // 8. SNo. 53:  Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 10:27 AM IST -> UTC 2026-09-28 04:57:00
    // 9. SNo. 52:  Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 10:28 AM IST -> UTC 2026-09-28 04:58:00

    const logsToInsert = [
      {
        sno: 124,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 4:48 PM',
        dateUtc: '2026-09-27 11:18:00',
        client_ref: 'TU_164800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8710,
        is_reversal: false
      },
      {
        sno: 122,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 5:22 PM',
        dateUtc: '2026-09-27 11:52:00',
        client_ref: 'TU_172200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 117,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 5:33 PM',
        dateUtc: '2026-09-27 12:03:00',
        client_ref: 'TU_173300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 115,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 5:42 PM',
        dateUtc: '2026-09-27 12:12:00',
        client_ref: 'STMT_174200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 106,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 5:58 PM',
        dateUtc: '2026-09-27 12:28:00',
        client_ref: 'STMT_175800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1510,
        is_reversal: false
      },
      {
        sno: 98,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 6:25 PM',
        dateUtc: '2026-09-27 12:55:00',
        client_ref: 'STMT_182500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1490,
        is_reversal: false
      },
      {
        sno: 97,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sun, Sep 27, 2026, 6:36 PM',
        dateUtc: '2026-09-27 13:06:00',
        client_ref: 'STMT_183600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1530,
        is_reversal: false
      },
      {
        sno: 53,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 10:27 AM',
        dateUtc: '2026-09-28 04:57:00',
        client_ref: 'TU_102700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8680,
        is_reversal: false
      },
      {
        sno: 52,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 10:28 AM',
        dateUtc: '2026-09-28 04:58:00',
        client_ref: 'TU_102800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8810,
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

    console.log('\n================ BATCH 82 INSERT & WALLET SETTLEMENT ================');
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
    console.error('Error in batch 82 execution:', err);
    process.exit(1);
  }
}

main();
