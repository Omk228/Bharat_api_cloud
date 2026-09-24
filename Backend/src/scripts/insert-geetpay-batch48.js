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

    // 7 logs from screenshots (Tue, Sep 22, 2026):
    // 1. Image 3 - SNo. 38: Transunion Credit Report V5 (Dr - Reversed) @ 2:01 PM IST -> UTC 08:31:10 (Reversed -> ₹0.00)
    // 2. Image 3 - SNo. 37: Transunion Credit Report V5 (Cr - Reversal / Refund Complete) @ 2:01 PM IST -> UTC 08:31:15 (₹0.00)
    // 3. Image 3 - SNo. 36: Crif High Mark Credit Report V4 (Dr) @ 2:01 PM IST -> UTC 08:31:30 (₹35.40)
    // 4. Image 3 - SNo. 35: Transunion Credit Report V5 (Dr) @ 2:01 PM IST -> UTC 08:31:45 (₹88.50)
    // 5. Image 3 - SNo. 34: Crif High Mark Credit Report V4 (Dr) @ 2:02 PM IST -> UTC 08:32:00 (₹35.40)
    // 6. Image 2 - SNo. 23: statement-analyzer (Dr) @ 2:11 PM IST -> UTC 08:41:00 (₹29.50)
    // 7. Image 1 - SNo. 17: Transunion Credit Report V5 (Dr) @ 2:20 PM IST -> UTC 08:50:00 (₹88.50)

    const logsToInsert = [
      {
        sno: 38,
        name: 'Transunion Credit Report V5 (Reversed)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:01 PM',
        dateUtc: '2026-09-22 08:31:10',
        client_ref: 'TU_140110_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal transaction - no balance deduction
        status_code: 200,
        result_code: 102,
        latency_ms: 1240,
        is_reversal: false
      },
      {
        sno: 37,
        name: 'Transunion Credit Report V5 (Reversal Transaction / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:01 PM',
        dateUtc: '2026-09-22 08:31:15',
        client_ref: 'TU_REFUND_140115_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - no charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1100,
        is_reversal: true
      },
      {
        sno: 36,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:01 PM',
        dateUtc: '2026-09-22 08:31:30',
        client_ref: 'CRIF_140130_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 35,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:01 PM',
        dateUtc: '2026-09-22 08:31:45',
        client_ref: 'TU_140145_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 34,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:02 PM',
        dateUtc: '2026-09-22 08:32:00',
        client_ref: 'CRIF_140200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1320,
        is_reversal: false
      },
      {
        sno: 23,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:11 PM',
        dateUtc: '2026-09-22 08:41:00',
        client_ref: 'STMT_141100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
        is_reversal: false
      },
      {
        sno: 17,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 2:20 PM',
        dateUtc: '2026-09-22 08:50:00',
        client_ref: 'TU_142000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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

    console.log('\n================ BATCH 48 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 48 insert:', err);
    process.exit(1);
  }
}

main();
