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
    // Image 2:
    // 1. SNo. 20: Crif High Mark Credit Report V4 (Dr) @ Wed, Sep 30, 2026, 4:08 PM IST -> UTC 2026-09-30 10:38:00
    // 2. SNo. 19: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 4:08 PM IST -> UTC 2026-09-30 10:38:05
    // 3. SNo. 18: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 4:08 PM IST -> UTC 2026-09-30 10:38:10
    // Image 1:
    // 4. SNo. 9: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 4:27 PM IST -> UTC 2026-09-30 10:57:00
    // 5. SNo. 8: Transunion Credit Report V5 (Cr - Reversal) @ Wed, Sep 30, 2026, 4:27 PM IST -> UTC 2026-09-30 10:57:05
    // 6. SNo. 7: Crif High Mark Credit Report V4 (Dr) @ Wed, Sep 30, 2026, 4:27 PM IST -> UTC 2026-09-30 10:57:10
    // 7. SNo. 6: Transunion Credit Report V5 (Dr) @ Wed, Sep 30, 2026, 4:37 PM IST -> UTC 2026-09-30 11:07:00

    const logsToInsert = [
      {
        sno: 20,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:08 PM',
        dateUtc: '2026-09-30 10:38:00',
        client_ref: 'CRIF_160800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6540,
        is_reversal: false
      },
      {
        sno: 19,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:08 PM',
        dateUtc: '2026-09-30 10:38:05',
        client_ref: 'TU_160805_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 18,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:08 PM',
        dateUtc: '2026-09-30 10:38:10',
        client_ref: 'REF_160810_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 110,
        is_reversal: true
      },
      {
        sno: 9,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:27 PM',
        dateUtc: '2026-09-30 10:57:00',
        client_ref: 'TU_162700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 8,
        name: 'Transunion Credit Report V5 (Reversal)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:27 PM',
        dateUtc: '2026-09-30 10:57:05',
        client_ref: 'REF_162705_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 200,
        result_code: 101,
        latency_ms: 115,
        is_reversal: true
      },
      {
        sno: 7,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:27 PM',
        dateUtc: '2026-09-30 10:57:10',
        client_ref: 'CRIF_162710_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 6590,
        is_reversal: false
      },
      {
        sno: 6,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Wed, Sep 30, 2026, 4:37 PM',
        dateUtc: '2026-09-30 11:07:00',
        client_ref: 'TU_163700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
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

    console.log('\n================ BATCH 105 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length} (including 2 Reversals / Refunds)`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 105 insert:', err);
    process.exit(1);
  }
}

main();
