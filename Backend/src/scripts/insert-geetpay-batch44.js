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

    // Platform prices
    const priceTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId); // 88.50
    const priceCrif = await PricingService.getEffectivePrice('/crif/Credit-ScoreV4', userId); // 35.40
    const priceStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId); // 29.50

    console.log(`Platform Pricing: Transunion: ₹${priceTU.toFixed(2)}, CRIF: ₹${priceCrif.toFixed(2)}, Statement: ₹${priceStmt.toFixed(2)}`);

    // 11 logs from screenshots (Mon, Sep 21, 2026):
    // 1. Image 5 - SNo. 40: statement-analyzer (Dr) @ 4:32 PM IST -> UTC 11:02:00 (₹29.50)
    // 2. Image 5 - SNo. 39: Transunion Credit Report V5 (Dr) @ 4:41 PM IST -> UTC 11:11:00 (₹88.50)
    // 3. Image 5 - SNo. 38: Crif High Mark Credit Report V4 (Dr) @ 4:42 PM IST -> UTC 11:12:00 (₹35.40)
    // 4. Image 5 - SNo. 31: Transunion Credit Report V5 (Dr) @ 5:12 PM IST -> UTC 11:42:00 (₹88.50)
    // 5. Image 4 - SNo. 27: Transunion Credit Report V5 (Dr) @ 5:30 PM IST -> UTC 12:00:00 (₹88.50)
    // 6. Image 3 - SNo. 15: statement-analyzer (Dr) @ 6:01 PM IST -> UTC 12:31:00 (₹29.50)
    // 7. Image 3 - SNo. 14: statement-analyzer (Dr) @ 6:02 PM IST -> UTC 12:32:00 (₹29.50)
    // 8. Image 3 - SNo. 13: Transunion Credit Report V5 (Dr) @ 6:03 PM IST -> UTC 12:33:00 (₹88.50)
    // 9. Image 2 - SNo. 7: Transunion Credit Report V5 (Dr) @ 6:11 PM IST -> UTC 12:41:00 (₹88.50)
    // 10. Image 1 - SNo. 4: statement-analyzer (Dr) @ 6:34 PM IST -> UTC 13:04:00 (₹29.50)
    // 11. Image 1 - SNo. 3: statement-analyzer (Dr) @ 6:35 PM IST -> UTC 13:05:00 (₹29.50)

    const logsToInsert = [
      {
        sno: 40,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 4:32 PM',
        dateUtc: '2026-09-21 11:02:00',
        client_ref: 'STMT_163200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
        is_reversal: false
      },
      {
        sno: 39,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 4:41 PM',
        dateUtc: '2026-09-21 11:11:00',
        client_ref: 'TU_164100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 38,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 4:42 PM',
        dateUtc: '2026-09-21 11:12:00',
        client_ref: 'CRIF_164200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 5:12 PM',
        dateUtc: '2026-09-21 11:42:00',
        client_ref: 'TU_171200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8910,
        is_reversal: false
      },
      {
        sno: 27,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 5:30 PM',
        dateUtc: '2026-09-21 12:00:00',
        client_ref: 'TU_173000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 15,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:01 PM',
        dateUtc: '2026-09-21 12:31:00',
        client_ref: 'STMT_180100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1390,
        is_reversal: false
      },
      {
        sno: 14,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:02 PM',
        dateUtc: '2026-09-21 12:32:00',
        client_ref: 'STMT_180200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1430,
        is_reversal: false
      },
      {
        sno: 13,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:03 PM',
        dateUtc: '2026-09-21 12:33:00',
        client_ref: 'TU_180300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 7,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:11 PM',
        dateUtc: '2026-09-21 12:41:00',
        client_ref: 'TU_181100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 4,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:34 PM',
        dateUtc: '2026-09-21 13:04:00',
        client_ref: 'STMT_183400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1410,
        is_reversal: false
      },
      {
        sno: 3,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 6:35 PM',
        dateUtc: '2026-09-21 13:05:00',
        client_ref: 'STMT_183500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1440,
        is_reversal: false
      }
    ];

    let totalDeduction = 0;

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
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${actualDeductionCost.toFixed(2)}${log.is_reversal || actualDeductionCost === 0 ? ' (REFUND / NO DEDUCTION)' : ''}`);
    }

    // Deduct only non-reversal charges from wallet balance
    if (totalDeduction > 0) {
      await dbPool.query(
        'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
        [totalDeduction, userId]
      );
    }

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 44 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 44 insert:', err);
    process.exit(1);
  }
}

main();
