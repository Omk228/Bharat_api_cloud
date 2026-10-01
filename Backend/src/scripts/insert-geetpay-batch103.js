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
    // 1. SNo. 63: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 2:50 PM IST -> UTC 2026-09-30 09:20:00
    // 2. SNo. 62: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 2:50 PM IST -> UTC 2026-09-30 09:20:05
    // 3. SNo. 61: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 2:50 PM IST -> UTC 2026-09-30 09:20:10
    // Image 4:
    // 4. SNo. 60: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 2:50 PM IST -> UTC 2026-09-30 09:20:15
    // 5. SNo. 58: Crif High Mark Credit Report V4 (Dr) @ Wed, Sep 30, 2026, 2:51 PM IST -> UTC 2026-09-30 09:21:00
    // 6. SNo. 54: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 2:52 PM IST -> UTC 2026-09-30 09:22:00
    // 7. SNo. 53: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 2:52 PM IST -> UTC 2026-09-30 09:22:05
    // Image 3:
    // 8. SNo. 24: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 3:27 PM IST -> UTC 2026-09-30 09:57:00
    // Image 2:
    // 9. SNo. 19: Transunion PDF Report (Dr) @ Wed, Sep 30, 2026, 3:31 PM IST -> UTC 2026-09-30 10:01:00
    // 10. SNo. 14: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 3:35 PM IST -> UTC 2026-09-30 10:05:00
    // 11. SNo. 12: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 3:37 PM IST -> UTC 2026-09-30 10:07:00
    // 12. SNo. 11: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 3:42 PM IST -> UTC 2026-09-30 10:12:00
    // Image 1:
    // 13. SNo. 10: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 3:42 PM IST -> UTC 2026-09-30 10:12:30
    // 14. SNo. 9: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 3:46 PM IST -> UTC 2026-09-30 10:16:00
    // 15. SNo. 5: statement-analyzer (Dr) @ Wed, Sep 30, 2026, 3:57 PM IST -> UTC 2026-09-30 10:27:00
    // 16. SNo. 4: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 4:01 PM IST -> UTC 2026-09-30 10:31:00
    // 17. SNo. 3: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 4:07 PM IST -> UTC 2026-09-30 10:37:00
    // 18. SNo. 1: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 4:07 PM IST -> UTC 2026-09-30 10:37:05

    const logsToInsert = [
      {
        sno: 63,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:50 PM',
        dateUtc: '2026-09-30 09:20:00',
        client_ref: 'TU_145000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 62,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:50 PM',
        dateUtc: '2026-09-30 09:20:05',
        client_ref: 'REF_145005_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 110,
        is_reversal: true
      },
      {
        sno: 61,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:50 PM',
        dateUtc: '2026-09-30 09:20:10',
        client_ref: 'TU_145010_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 60,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:50 PM',
        dateUtc: '2026-09-30 09:20:15',
        client_ref: 'REF_145015_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 120,
        is_reversal: true
      },
      {
        sno: 58,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:51 PM',
        dateUtc: '2026-09-30 09:21:00',
        client_ref: 'CRIF_145100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6540,
        is_reversal: false
      },
      {
        sno: 54,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:52 PM',
        dateUtc: '2026-09-30 09:22:00',
        client_ref: 'TU_145200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 53,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 2:52 PM',
        dateUtc: '2026-09-30 09:22:05',
        client_ref: 'REF_145205_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 115,
        is_reversal: true
      },
      {
        sno: 24,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:27 PM',
        dateUtc: '2026-09-30 09:57:00',
        client_ref: 'TU_PDF_152700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 19,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:31 PM',
        dateUtc: '2026-09-30 10:01:00',
        client_ref: 'TU_PDF_153100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 14,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:35 PM',
        dateUtc: '2026-09-30 10:05:00',
        client_ref: 'TU_153500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 12,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:37 PM',
        dateUtc: '2026-09-30 10:07:00',
        client_ref: 'TU_153700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8810,
        is_reversal: false
      },
      {
        sno: 11,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:42 PM',
        dateUtc: '2026-09-30 10:12:00',
        client_ref: 'STMT_154201_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 10,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:42 PM',
        dateUtc: '2026-09-30 10:12:30',
        client_ref: 'STMT_154202_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1480,
        is_reversal: false
      },
      {
        sno: 9,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:46 PM',
        dateUtc: '2026-09-30 10:16:00',
        client_ref: 'STMT_154600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 5,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 3:57 PM',
        dateUtc: '2026-09-30 10:27:00',
        client_ref: 'STMT_155700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1490,
        is_reversal: false
      },
      {
        sno: 4,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:01 PM',
        dateUtc: '2026-09-30 10:31:00',
        client_ref: 'TU_160100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:07 PM',
        dateUtc: '2026-09-30 10:37:00',
        client_ref: 'TU_160700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 1,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:07 PM',
        dateUtc: '2026-09-30 10:37:05',
        client_ref: 'REF_160705_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 120,
        is_reversal: true
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

    console.log('\n================ BATCH 103 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length} (including 4 Reversals / Refunds)`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 103 insert:', err);
    process.exit(1);
  }
}

main();
