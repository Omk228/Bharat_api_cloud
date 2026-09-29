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

    console.log(`Platform Pricing for loan@geetpay.in:`);
    console.log(`- TransUnion CIBIL V5: ₹${priceTU.toFixed(2)}`);
    console.log(`- CRIF High Mark V4: ₹${priceCrif.toFixed(2)}`);
    console.log(`- Statement Analyzer V2: ₹${priceStmt.toFixed(2)}`);

    // Logs to insert from user screenshots (Sat, Sep 26, 2026):
    // 1. Image 5 - SNo. 56: Transunion Credit Report V5 (Dr) @ Sat, Sep 26, 2026, 11:08 AM IST -> UTC 2026-09-26 05:38:00
    // 2. Image 4 - SNo. 29: statement-analyzer (Dr) @ Sat, Sep 26, 2026, 11:57 AM IST -> UTC 2026-09-26 06:27:00
    // 3. Image 4 - SNo. 22: Transunion Credit Report V5 (Dr) @ Sat, Sep 26, 2026, 12:01 PM IST -> UTC 2026-09-26 06:31:00
    // 4. Image 3 - SNo. 15: Transunion Credit Report V5 (Dr) @ Sat, Sep 26, 2026, 12:38 PM IST -> UTC 2026-09-26 07:08:00
    // 5. Image 1 - SNo. 10: Transunion PDF Report (Dr) @ Sat, Sep 26, 2026, 12:41 PM IST -> UTC 2026-09-26 07:11:00
    // 6. Image 1 - SNo. 9:  Transunion Credit Report V5 (Dr) @ Sat, Sep 26, 2026, 12:53 PM IST -> UTC 2026-09-26 07:23:00
    // 7. Image 1 - SNo. 8:  statement-analyzer (Dr) @ Sat, Sep 26, 2026, 1:02 PM IST -> UTC 2026-09-26 07:32:00
    // 8. Image 1 - SNo. 6:  statement-analyzer (Dr) @ Sat, Sep 26, 2026, 1:10 PM IST -> UTC 2026-09-26 07:40:00
    // 9. Image 2 - SNo. 1:  Transunion Credit Report V5 (Dr) @ Sat, Sep 26, 2026, 1:20 PM IST -> UTC 2026-09-26 07:50:00

    const logsToInsert = [
      {
        sno: 56,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 11:08 AM',
        dateUtc: '2026-09-26 05:38:00',
        client_ref: 'TU_110800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 29,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 11:57 AM',
        dateUtc: '2026-09-26 06:27:00',
        client_ref: 'STMT_115700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 22,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 12:01 PM',
        dateUtc: '2026-09-26 06:31:00',
        client_ref: 'TU_120100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8780,
        is_reversal: false
      },
      {
        sno: 15,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 12:38 PM',
        dateUtc: '2026-09-26 07:08:00',
        client_ref: 'TU_123800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 10,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 12:41 PM',
        dateUtc: '2026-09-26 07:11:00',
        client_ref: 'TU_PDF_124100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 9,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 12:53 PM',
        dateUtc: '2026-09-26 07:23:00',
        client_ref: 'TU_125300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8760,
        is_reversal: false
      },
      {
        sno: 8,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 1:02 PM',
        dateUtc: '2026-09-26 07:32:00',
        client_ref: 'STMT_130200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1450,
        is_reversal: false
      },
      {
        sno: 6,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 1:10 PM',
        dateUtc: '2026-09-26 07:40:00',
        client_ref: 'STMT_131000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1490,
        is_reversal: false
      },
      {
        sno: 1,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Sat, Sep 26, 2026, 1:20 PM',
        dateUtc: '2026-09-26 07:50:00',
        client_ref: 'TU_132000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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

    console.log('\n================ BATCH 75 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 75 insert:', err);
    process.exit(1);
  }
}

main();
