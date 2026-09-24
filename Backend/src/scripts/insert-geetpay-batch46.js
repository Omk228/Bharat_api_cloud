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

    // 8 logs from screenshots (Tue, Sep 22, 2026):
    // 1. Image 5 - SNo. 120: Transunion Credit Report V5 (Dr) @ 11:35 AM IST -> UTC 06:05:00 (₹88.50)
    // 2. Image 4 - SNo. 97: statement-analyzer (Dr) @ 11:59 AM IST -> UTC 06:29:00 (₹29.50)
    // 3. Image 3 - SNo. 79: Transunion Credit Report V5 (Dr) @ 12:20 PM IST -> UTC 06:50:00 (₹88.50)
    // 4. Image 2 - SNo. 66: Transunion Credit Report V5 (Dr - Reversed) @ 12:25 PM IST -> UTC 06:55:10 (Reversed -> ₹0.00)
    // 5. Image 2 - SNo. 64: Transunion Credit Report V5 (Cr - Reversal / Refund Complete) @ 12:25 PM IST -> UTC 06:55:15 (₹0.00)
    // 6. Image 2 - SNo. 62: Crif High Mark Credit Report V4 (Dr) @ 12:25 PM IST -> UTC 06:55:30 (₹35.40)
    // 7. Image 1 - SNo. 29: statement-analyzer (Dr) @ 1:05 PM IST -> UTC 07:35:00 (₹29.50)
    // 8. Image 1 - SNo. 26: Transunion Credit Report V5 (Dr) @ 1:13 PM IST -> UTC 07:43:00 (₹88.50)

    const logsToInsert = [
      {
        sno: 120,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 11:35 AM',
        dateUtc: '2026-09-22 06:05:00',
        client_ref: 'TU_113500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 97,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 11:59 AM',
        dateUtc: '2026-09-22 06:29:00',
        client_ref: 'STMT_115900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
        is_reversal: false
      },
      {
        sno: 79,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 12:20 PM',
        dateUtc: '2026-09-22 06:50:00',
        client_ref: 'TU_122000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8920,
        is_reversal: false
      },
      {
        sno: 66,
        name: 'Transunion Credit Report V5 (Reversed)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 12:25 PM',
        dateUtc: '2026-09-22 06:55:10',
        client_ref: 'TU_122510_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal transaction - no balance deduction
        status_code: 200,
        result_code: 102,
        latency_ms: 1240,
        is_reversal: false
      },
      {
        sno: 64,
        name: 'Transunion Credit Report V5 (Reversal Transaction / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 12:25 PM',
        dateUtc: '2026-09-22 06:55:15',
        client_ref: 'TU_REFUND_122515_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - no charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1100,
        is_reversal: true
      },
      {
        sno: 62,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 12:25 PM',
        dateUtc: '2026-09-22 06:55:30',
        client_ref: 'CRIF_122530_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1320,
        is_reversal: false
      },
      {
        sno: 29,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 1:05 PM',
        dateUtc: '2026-09-22 07:35:00',
        client_ref: 'STMT_130500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1410,
        is_reversal: false
      },
      {
        sno: 26,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 1:13 PM',
        dateUtc: '2026-09-22 07:43:00',
        client_ref: 'TU_131300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
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

    console.log('\n================ BATCH 46 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 46 insert:', err);
    process.exit(1);
  }
}

main();
