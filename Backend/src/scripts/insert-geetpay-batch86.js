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
    // Image 4:
    // 1. SNo. 32: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 3:06 PM IST -> UTC 2026-09-28 09:36:00
    // 2. SNo. 31: Crif High Mark Credit Report V4 (Dr) @ Mon, Sep 28, 2026, 3:07 PM IST -> UTC 2026-09-28 09:37:00
    // Image 3:
    // 3. SNo. 30: Transunion Credit Report V5 (Cr - Reversal / Refund Complete) @ Mon, Sep 28, 2026, 3:07 PM IST -> UTC 2026-09-28 09:37:05 (₹0.00)
    // 4. SNo. 27: statement-analyzer (Dr) @ Mon, Sep 28, 2026, 3:18 PM IST -> UTC 2026-09-28 09:48:00
    // 5. SNo. 25: Transunion PDF Report (Dr) @ Mon, Sep 28, 2026, 3:24 PM IST -> UTC 2026-09-28 09:54:00
    // Image 2:
    // 6. SNo. 18: Transunion PDF Report (Dr) @ Mon, Sep 28, 2026, 3:27 PM IST -> UTC 2026-09-28 09:57:00
    // 7. SNo. 15: Transunion PDF Report (Dr) @ Mon, Sep 28, 2026, 3:32 PM IST -> UTC 2026-09-28 10:02:00
    // 8. SNo. 11: Transunion PDF Report (Dr) @ Mon, Sep 28, 2026, 3:41 PM IST -> UTC 2026-09-28 10:11:00
    // Image 1:
    // 9. SNo. 10: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 3:42 PM IST -> UTC 2026-09-28 10:12:00
    // 10. SNo. 8: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 3:53 PM IST -> UTC 2026-09-28 10:23:00
    // 11. SNo. 7: Transunion Credit Report V5 (Dr) @ Mon, Sep 28, 2026, 3:54 PM IST -> UTC 2026-09-28 10:24:00
    // 12. SNo. 6: Crif High Mark Credit Report V4 (Dr) @ Mon, Sep 28, 2026, 3:55 PM IST -> UTC 2026-09-28 10:25:00
    // 13. SNo. 3: Crif High Mark Credit Report V4 (Dr) @ Mon, Sep 28, 2026, 3:55 PM IST -> UTC 2026-09-28 10:25:30

    const logsToInsert = [
      {
        sno: 32,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:06 PM',
        dateUtc: '2026-09-28 09:36:00',
        client_ref: 'TU_150600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8790,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:07 PM',
        dateUtc: '2026-09-28 09:37:00',
        client_ref: 'CRIF_150700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6540,
        is_reversal: false
      },
      {
        sno: 30,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:07 PM',
        dateUtc: '2026-09-28 09:37:05',
        client_ref: 'REF_150705_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 110,
        is_reversal: true
      },
      {
        sno: 27,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:18 PM',
        dateUtc: '2026-09-28 09:48:00',
        client_ref: 'STMT_151800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1510,
        is_reversal: false
      },
      {
        sno: 25,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:24 PM',
        dateUtc: '2026-09-28 09:54:00',
        client_ref: 'TU_PDF_152400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 18,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:27 PM',
        dateUtc: '2026-09-28 09:57:00',
        client_ref: 'TU_PDF_152700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8910,
        is_reversal: false
      },
      {
        sno: 15,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:32 PM',
        dateUtc: '2026-09-28 10:02:00',
        client_ref: 'TU_PDF_153200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 11,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:41 PM',
        dateUtc: '2026-09-28 10:11:00',
        client_ref: 'TU_PDF_154100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8790,
        is_reversal: false
      },
      {
        sno: 10,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:42 PM',
        dateUtc: '2026-09-28 10:12:00',
        client_ref: 'TU_154200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 8,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:53 PM',
        dateUtc: '2026-09-28 10:23:00',
        client_ref: 'TU_155300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 7,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:54 PM',
        dateUtc: '2026-09-28 10:24:00',
        client_ref: 'TU_155400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 6,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:55 PM',
        dateUtc: '2026-09-28 10:25:00',
        client_ref: 'CRIF_155500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6610,
        is_reversal: false
      },
      {
        sno: 3,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 28, 2026, 3:55 PM',
        dateUtc: '2026-09-28 10:25:30',
        client_ref: 'CRIF_155530_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6590,
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

    console.log('\n================ BATCH 86 INSERT & WALLET SETTLEMENT ================');
    console.log(`User: ${updatedUser[0].email} (ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length} (including 1 Reversal / Refund)`);
    console.log(`Starting Wallet Balance: ₹${startingBalance.toFixed(2)}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Final Updated Wallet Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('=======================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error in batch 86 execution:', err);
    process.exit(1);
  }
}

main();
