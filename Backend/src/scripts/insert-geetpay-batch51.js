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

    // 11 logs from screenshots (Wed, Sep 23, 2026):
    // 1. Image 5 - SNo. 51: Transunion Credit Report V5 (Dr) @ 11:11 AM IST -> UTC 05:41:00 (₹88.50)
    // 2. Image 4 - SNo. 37: Transunion Credit Report V5 (Dr) @ 11:49 AM IST -> UTC 06:19:00 (₹88.50)
    // 3. Image 4 - SNo. 36: statement-analyzer (Dr) @ 11:55 AM IST -> UTC 06:25:00 (₹29.50)
    // 4. Image 3 - SNo. 29: Transunion Credit Report V5 (Dr) @ 12:04 PM IST -> UTC 06:34:00 (₹88.50)
    // 5. Image 3 - SNo. 26: statement-analyzer (Dr) @ 12:20 PM IST -> UTC 06:50:00 (₹29.50)
    // 6. Image 3 - SNo. 23: Transunion Credit Report V5 (Dr) @ 12:22 PM IST -> UTC 06:52:00 (₹88.50)
    // 7. Image 3 - SNo. 22: Transunion Credit Report V5 (Cr - Reversal Transaction / Refund Complete) @ 12:22 PM IST -> UTC 06:52:15 (₹0.00 - No wallet deduction)
    // 8. Image 3 - SNo. 21: Crif High Mark Credit Report V4 (Dr) @ 12:22 PM IST -> UTC 06:52:30 (₹35.40)
    // 9. Image 2 - SNo. 16: Transunion Credit Report V5 (Dr) @ 12:38 PM IST -> UTC 07:08:00 (₹88.50)
    // 10. Image 1 - SNo. 6: statement-analyzer (Dr) @ 12:58 PM IST -> UTC 07:28:00 (₹29.50)
    // 11. Image 1 - SNo. 5: Transunion Credit Report V5 (Dr) @ 1:05 PM IST -> UTC 07:35:00 (₹88.50)

    const logsToInsert = [
      {
        sno: 51,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 11:11 AM',
        dateUtc: '2026-09-23 05:41:00',
        client_ref: 'TU_111100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 37,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 11:49 AM',
        dateUtc: '2026-09-23 06:19:00',
        client_ref: 'TU_114900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 36,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 11:55 AM',
        dateUtc: '2026-09-23 06:25:00',
        client_ref: 'STMT_115500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1430,
        is_reversal: false
      },
      {
        sno: 29,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:04 PM',
        dateUtc: '2026-09-23 06:34:00',
        client_ref: 'TU_120400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8910,
        is_reversal: false
      },
      {
        sno: 26,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:20 PM',
        dateUtc: '2026-09-23 06:50:00',
        client_ref: 'STMT_122000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
        is_reversal: false
      },
      {
        sno: 23,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:22 PM',
        dateUtc: '2026-09-23 06:52:00',
        client_ref: 'TU_122200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8880,
        is_reversal: false
      },
      {
        sno: 22,
        name: 'Transunion Credit Report V5 (Reversal Transaction / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:22 PM',
        dateUtc: '2026-09-23 06:52:15',
        client_ref: 'TU_REFUND_122215_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 102,
        latency_ms: 1090,
        is_reversal: true
      },
      {
        sno: 21,
        name: 'CRIF High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:22 PM',
        dateUtc: '2026-09-23 06:52:30',
        client_ref: 'CRIF_122230_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 16,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:38 PM',
        dateUtc: '2026-09-23 07:08:00',
        client_ref: 'TU_123800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 6,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 12:58 PM',
        dateUtc: '2026-09-23 07:28:00',
        client_ref: 'STMT_125800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1410,
        is_reversal: false
      },
      {
        sno: 5,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 23, 2026, 1:05 PM',
        dateUtc: '2026-09-23 07:35:00',
        client_ref: 'TU_130500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8920,
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
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${actualDeductionCost.toFixed(2)}${log.is_reversal || actualDeductionCost === 0 ? ' (REFUND / REVERSAL - NO WALLET DEDUCTION)' : ''}`);
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

    console.log('\n================ BATCH 51 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length} (including 1 zero-cost reversal transaction)`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 51 insert:', err);
    process.exit(1);
  }
}

main();
