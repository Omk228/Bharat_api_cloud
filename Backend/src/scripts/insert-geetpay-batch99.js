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
    const priceTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId);
    const priceCrif = await PricingService.getEffectivePrice('/crif/Credit-ScoreV4', userId);
    const priceStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId);

    console.log(`Platform Pricing for loan@geetpay.in:`);
    console.log(`- TransUnion CIBIL V5 (/srv5/transunion-Score-Hybrid): ₹${priceTU.toFixed(2)}`);
    console.log(`- CRIF High Mark V4 (/crif/Credit-ScoreV4): ₹${priceCrif.toFixed(2)}`);
    console.log(`- Statement Analyzer V2 (/srv2/statement-analyzer): ₹${priceStmt.toFixed(2)}`);

    // Logs to insert from user screenshots:
    // Image 5 (Tue, Sep 29, 2026):
    // 1. SNo. 90: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 6:21 PM IST -> UTC 2026-09-29 12:51:00
    // 2. SNo. 87: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 6:28 PM IST -> UTC 2026-09-29 12:58:00
    // 3. SNo. 83: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 6:40 PM IST -> UTC 2026-09-29 13:10:00
    // Image 4 (Tue, Sep 29, 2026):
    // 4. SNo. 80: Transunion PDF Report (Dr) @ Tue, Sep 29, 2026, 6:47 PM IST -> UTC 2026-09-29 13:17:00
    // 5. SNo. 77: Transunion PDF Report (Dr) @ Tue, Sep 29, 2026, 6:51 PM IST -> UTC 2026-09-29 13:21:00
    // 6. SNo. 73: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 7:00 PM IST -> UTC 2026-09-29 13:30:00
    // 7. SNo. 72: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 7:09 PM IST -> UTC 2026-09-29 13:39:00
    // Image 3 (Wed, Sep 30, 2026):
    // 8. SNo. 39: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 9:59 AM IST -> UTC 2026-09-30 04:29:00
    // 9. SNo. 34: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 10:09 AM IST -> UTC 2026-09-30 04:39:00
    // 10. SNo. 33: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 10:09 AM IST -> UTC 2026-09-30 04:39:00
    // 11. SNo. 32: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 10:09 AM IST -> UTC 2026-09-30 04:39:00
    // 12. SNo. 31: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 10:11 AM IST -> UTC 2026-09-30 04:41:00
    // Image 2 (Wed, Sep 30, 2026):
    // 13. SNo. 22: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 10:30 AM IST -> UTC 2026-09-30 05:00:00
    // Image 1 (Wed, Sep 30, 2026):
    // 14. SNo. 19: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 10:34 AM IST -> UTC 2026-09-30 05:04:00
    // 15. SNo. 18: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 10:39 AM IST -> UTC 2026-09-30 05:09:00

    const logsToInsert = [
      {
        sno: 90,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 6:21 PM',
        dateUtc: '2026-09-29 12:51:00',
        client_ref: 'STMT_182100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1450,
        is_reversal: false
      },
      {
        sno: 87,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 6:28 PM',
        dateUtc: '2026-09-29 12:58:00',
        client_ref: 'STMT_182800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1480,
        is_reversal: false
      },
      {
        sno: 83,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 6:40 PM',
        dateUtc: '2026-09-29 13:10:00',
        client_ref: 'STMT_184000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 80,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 6:47 PM',
        dateUtc: '2026-09-29 13:17:00',
        client_ref: 'TU_PDF_184700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 77,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 6:51 PM',
        dateUtc: '2026-09-29 13:21:00',
        client_ref: 'TU_PDF_185100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 73,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 7:00 PM',
        dateUtc: '2026-09-29 13:30:00',
        client_ref: 'STMT_190000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 72,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 7:09 PM',
        dateUtc: '2026-09-29 13:39:00',
        client_ref: 'STMT_190900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1490,
        is_reversal: false
      },
      {
        sno: 39,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 9:59 AM',
        dateUtc: '2026-09-30 04:29:00',
        client_ref: 'TU_095900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 34,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:09 AM',
        dateUtc: '2026-09-30 04:39:00',
        client_ref: 'TU_PDF_100900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 33,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:09 AM',
        dateUtc: '2026-09-30 04:39:00',
        client_ref: 'TU_100901_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8810,
        is_reversal: false
      },
      {
        sno: 32,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:09 AM',
        dateUtc: '2026-09-30 04:39:00',
        client_ref: 'TU_100902_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:11 AM',
        dateUtc: '2026-09-30 04:41:00',
        client_ref: 'TU_101100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 22,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:30 AM',
        dateUtc: '2026-09-30 05:00:00',
        client_ref: 'STMT_103000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 19,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:34 AM',
        dateUtc: '2026-09-30 05:04:00',
        client_ref: 'TU_103400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 18,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 10:39 AM',
        dateUtc: '2026-09-30 05:09:00',
        client_ref: 'TU_103900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
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

    console.log('\n================ BATCH 99 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 99 insert:', err);
    process.exit(1);
  }
}

main();
