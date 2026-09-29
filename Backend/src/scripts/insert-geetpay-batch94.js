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

    // Logs to insert from user screenshots (Tue, Sep 29, 2026):
    // Screenshot 1:
    // 1. SNo. 61: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 1:38 PM IST -> UTC 2026-09-29 08:08:00
    // 2. SNo. 62: Crif High Mark Credit Report V4 (Dr) @ Tue, Sep 29, 2026, 1:34 PM IST -> UTC 2026-09-29 08:04:00
    // 3. SNo. 63: Transunion Credit Report V5 (Dr) @ Tue, Sep 29, 2026, 1:33 PM IST -> UTC 2026-09-29 08:03:00
    // 4. SNo. 64: Crif High Mark Credit Report V4 (Dr) @ Tue, Sep 29, 2026, 1:32 PM IST -> UTC 2026-09-29 08:02:00
    // 5. SNo. 65: Transunion Credit Report V5 (Dr) @ Tue, Sep 29, 2026, 1:31 PM IST -> UTC 2026-09-29 08:01:00
    // 6. SNo. 66: Transunion Credit Report V5 (Dr) @ Tue, Sep 29, 2026, 1:30 PM IST -> UTC 2026-09-29 08:00:00
    // 7. SNo. 68: Crif High Mark Credit Report V4 (Dr) @ Tue, Sep 29, 2026, 1:26 PM IST -> UTC 2026-09-29 07:56:00
    // 8. SNo. 69: Transunion Credit Report V5 (Dr) @ Tue, Sep 29, 2026, 1:25 PM IST -> UTC 2026-09-29 07:55:00
    // Screenshot 2:
    // 9. SNo. 89: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 12:59 PM IST -> UTC 2026-09-29 07:29:00
    // Screenshot 3:
    // 10. SNo. 112: statement-analyzer (Dr) @ Tue, Sep 29, 2026, 12:44 PM IST -> UTC 2026-09-29 07:14:00
    // 11. SNo. 117: Transunion Credit Report V5 (Dr) @ Tue, Sep 29, 2026, 12:37 PM IST -> UTC 2026-09-29 07:07:00

    const logsToInsert = [
      {
        sno: 61,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:38 PM',
        dateUtc: '2026-09-29 08:08:00',
        client_ref: 'STMT_133801_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
        is_reversal: false
      },
      {
        sno: 62,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:34 PM',
        dateUtc: '2026-09-29 08:04:00',
        client_ref: 'CRIF_133401_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1820,
        is_reversal: false
      },
      {
        sno: 63,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:33 PM',
        dateUtc: '2026-09-29 08:03:00',
        client_ref: 'TU_133301_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8810,
        is_reversal: false
      },
      {
        sno: 64,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:32 PM',
        dateUtc: '2026-09-29 08:02:00',
        client_ref: 'CRIF_133201_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1840,
        is_reversal: false
      },
      {
        sno: 65,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:31 PM',
        dateUtc: '2026-09-29 08:01:00',
        client_ref: 'TU_133101_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8790,
        is_reversal: false
      },
      {
        sno: 66,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:30 PM',
        dateUtc: '2026-09-29 08:00:00',
        client_ref: 'TU_133001_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 68,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:26 PM',
        dateUtc: '2026-09-29 07:56:00',
        client_ref: 'CRIF_132601_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1810,
        is_reversal: false
      },
      {
        sno: 69,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 1:25 PM',
        dateUtc: '2026-09-29 07:55:00',
        client_ref: 'TU_132501_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 89,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 12:59 PM',
        dateUtc: '2026-09-29 07:29:00',
        client_ref: 'STMT_125901_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1450,
        is_reversal: false
      },
      {
        sno: 112,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 12:44 PM',
        dateUtc: '2026-09-29 07:14:00',
        client_ref: 'STMT_124401_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 117,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 29, 2026, 12:37 PM',
        dateUtc: '2026-09-29 07:07:00',
        client_ref: 'TU_123701_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
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

    console.log('\n================ BATCH 94 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 94 insert:', err);
    process.exit(1);
  }
}

main();
