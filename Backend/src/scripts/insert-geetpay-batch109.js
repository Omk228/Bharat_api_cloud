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

    // Logs to insert from user screenshots (Thu, Oct 01, 2026):
    // Image 5:
    // 1. SNo. 76: Transunion PDF Report (Dr) @ Thu, Oct 01, 2026, 9:17 AM IST -> UTC 2026-10-01 03:47:00
    // 2. SNo. 75: Transunion Credit Report V5 (Dr) @ Thu, Oct 01, 2026, 9:17 AM IST -> UTC 2026-10-01 03:47:05
    // Image 4:
    // 3. SNo. 46: Transunion Credit Report V5 (Dr) @ Thu, Oct 01, 2026, 10:34 AM IST -> UTC 2026-10-01 05:04:00
    // 4. SNo. 45: Transunion Credit Report V5 (Cr - Reversal) @ Thu, Oct 01, 2026, 10:34 AM IST -> UTC 2026-10-01 05:04:05
    // 5. SNo. 44: Crif High Mark Credit Report V4 (Dr) @ Thu, Oct 01, 2026, 10:34 AM IST -> UTC 2026-10-01 05:04:10
    // 6. SNo. 42: Crif High Mark Credit Report V4 (Dr) @ Thu, Oct 01, 2026, 10:35 AM IST -> UTC 2026-10-01 05:05:00
    // Image 3:
    // 7. SNo. 31: Transunion Credit Report V5 (Dr) @ Thu, Oct 01, 2026, 10:43 AM IST -> UTC 2026-10-01 05:13:00
    // Image 2:
    // 8. SNo. 25: Transunion Credit Report V5 (Dr) @ Thu, Oct 01, 2026, 10:43 AM IST -> UTC 2026-10-01 05:13:05
    // 9. SNo. 24: Crif High Mark Credit Report V4 (Dr) @ Thu, Oct 01, 2026, 10:44 AM IST -> UTC 2026-10-01 05:14:00
    // Image 1:
    // 10. SNo. 6: Transunion Credit Report V5 (Dr) @ Thu, Oct 01, 2026, 10:55 AM IST -> UTC 2026-10-01 05:25:00
    // 11. SNo. 5: statement-analyzer (Dr) @ Thu, Oct 01, 2026, 10:58 AM IST -> UTC 2026-10-01 05:28:00

    const logsToInsert = [
      {
        sno: 76,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 9:17 AM',
        dateUtc: '2026-10-01 03:47:00',
        client_ref: 'TU_PDF_091700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 75,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 9:17 AM',
        dateUtc: '2026-10-01 03:47:05',
        client_ref: 'TU_091705_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 46,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:34 AM',
        dateUtc: '2026-10-01 05:04:00',
        client_ref: 'TU_103400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 45,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:34 AM',
        dateUtc: '2026-10-01 05:04:05',
        client_ref: 'REF_103405_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 110,
        is_reversal: true
      },
      {
        sno: 44,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:34 AM',
        dateUtc: '2026-10-01 05:04:10',
        client_ref: 'CRIF_103410_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6540,
        is_reversal: false
      },
      {
        sno: 42,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:35 AM',
        dateUtc: '2026-10-01 05:05:00',
        client_ref: 'CRIF_103500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6560,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:43 AM',
        dateUtc: '2026-10-01 05:13:00',
        client_ref: 'TU_104300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 25,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:43 AM',
        dateUtc: '2026-10-01 05:13:05',
        client_ref: 'TU_104305_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 24,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:44 AM',
        dateUtc: '2026-10-01 05:14:00',
        client_ref: 'CRIF_104400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6550,
        is_reversal: false
      },
      {
        sno: 6,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:55 AM',
        dateUtc: '2026-10-01 05:25:00',
        client_ref: 'TU_105500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 5,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Oct 01, 2026, 10:58 AM',
        dateUtc: '2026-10-01 05:28:00',
        client_ref: 'STMT_105800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1480,
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

    console.log('\n================ BATCH 109 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length} (including 1 Reversal / Refund)`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 109 insert:', err);
    process.exit(1);
  }
}

main();
