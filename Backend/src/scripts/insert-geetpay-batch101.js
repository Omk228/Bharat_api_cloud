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

    // Logs to insert from user screenshots (Wed, Sep 30, 2026):
    // Image 5:
    // 1. SNo. 89: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 12:36 PM IST -> UTC 2026-09-30 07:06:00
    // Image 4:
    // 2. SNo. 70: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 12:47 PM IST -> UTC 2026-09-30 07:17:00
    // Image 3:
    // 3. SNo. 25: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 1:28 PM IST -> UTC 2026-09-30 07:58:00
    // 4. SNo. 21: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 1:30 PM IST -> UTC 2026-09-30 08:00:00
    // Image 2:
    // 5. SNo. 20: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 1:30 PM IST -> UTC 2026-09-30 08:00:00
    // 6. SNo. 19: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 1:30 PM IST -> UTC 2026-09-30 08:00:00
    // 7. SNo. 18: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 1:36 PM IST -> UTC 2026-09-30 08:06:00
    // Image 1:
    // 8. SNo. 4: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 1:56 PM IST -> UTC 2026-09-30 08:26:00
    // 9. SNo. 3: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 1:56 PM IST -> UTC 2026-09-30 08:26:00

    const logsToInsert = [
      {
        sno: 89,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 12:36 PM',
        dateUtc: '2026-09-30 07:06:00',
        client_ref: 'STMT_123600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 70,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 12:47 PM',
        dateUtc: '2026-09-30 07:17:00',
        client_ref: 'TU_124700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 25,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:28 PM',
        dateUtc: '2026-09-30 07:58:00',
        client_ref: 'STMT_132800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 21,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:30 PM',
        dateUtc: '2026-09-30 08:00:00',
        client_ref: 'TU_PDF_133001_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 20,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:30 PM',
        dateUtc: '2026-09-30 08:00:00',
        client_ref: 'TU_PDF_133002_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 19,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:30 PM',
        dateUtc: '2026-09-30 08:00:00',
        client_ref: 'TU_133000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 18,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:36 PM',
        dateUtc: '2026-09-30 08:06:00',
        client_ref: 'STMT_133600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1480,
        is_reversal: false
      },
      {
        sno: 4,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:56 PM',
        dateUtc: '2026-09-30 08:26:00',
        client_ref: 'TU_PDF_135600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 1:56 PM',
        dateUtc: '2026-09-30 08:26:00',
        client_ref: 'TU_135600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
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

    console.log('\n================ BATCH 101 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 101 insert:', err);
    process.exit(1);
  }
}

main();
