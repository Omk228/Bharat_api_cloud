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
    const priceTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId); // 88.50
    const priceCrif = await PricingService.getEffectivePrice('/crif/Credit-ScoreV4', userId); // 35.40
    const priceStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId); // 29.50

    console.log(`Platform Pricing for loan@geetpay.in:`);
    console.log(`- TransUnion CIBIL V5: ₹${priceTU.toFixed(2)}`);
    console.log(`- CRIF High Mark V4: ₹${priceCrif.toFixed(2)}`);
    console.log(`- Statement Analyzer V2: ₹${priceStmt.toFixed(2)}`);

    // 9 logs from user screenshots (Thu, Sep 24, 2026 3:28 PM - 4:14 PM):
    // 1. Image 1 - SNo. 3: Transunion Credit Report V5 (Cr / Reversal) @ 4:14 PM IST -> UTC 2026-09-24 10:44:00
    // 2. Image 1 - SNo. 4: Transunion Credit Report V5 (Dr) @ 4:14 PM IST -> UTC 2026-09-24 10:44:00
    // 3. Image 2 - SNo. 12: Transunion Credit Report V5 (Dr) @ 3:58 PM IST -> UTC 2026-09-24 10:28:00
    // 4. Image 2 - SNo. 19: Transunion Credit Report V5 (Dr) @ 3:51 PM IST -> UTC 2026-09-24 10:21:00
    // 5. Image 3 - SNo. 24: Transunion Credit Report V5 (Dr) @ 3:44 PM IST -> UTC 2026-09-24 10:14:00
    // 6. Image 3 - SNo. 27: Transunion Credit Report V5 (Dr) @ 3:41 PM IST -> UTC 2026-09-24 10:11:00
    // 7. Image 4 - SNo. 33: Transunion Credit Report V5 (Dr) @ 3:36 PM IST -> UTC 2026-09-24 10:06:00
    // 8. Image 4 - SNo. 35: Transunion Credit Report V5 (Dr) @ 3:34 PM IST -> UTC 2026-09-24 10:04:00
    // 9. Image 5 - SNo. 46: statement-analyzer (Dr) @ 3:28 PM IST -> UTC 2026-09-24 09:58:00

    const logsToInsert = [
      {
        sno: 3,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 4:14 PM',
        dateUtc: '2026-09-24 10:44:00',
        client_ref: 'TU_161401_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00,
        status_code: 500,
        result_code: 102,
        latency_ms: 10240,
        is_reversal: true
      },
      {
        sno: 4,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 4:14 PM',
        dateUtc: '2026-09-24 10:44:00',
        client_ref: 'TU_161402_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 12,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:58 PM',
        dateUtc: '2026-09-24 10:28:00',
        client_ref: 'TU_155800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8790,
        is_reversal: false
      },
      {
        sno: 19,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:51 PM',
        dateUtc: '2026-09-24 10:21:00',
        client_ref: 'TU_155100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8920,
        is_reversal: false
      },
      {
        sno: 24,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:44 PM',
        dateUtc: '2026-09-24 10:14:00',
        client_ref: 'TU_154400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8810,
        is_reversal: false
      },
      {
        sno: 27,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:41 PM',
        dateUtc: '2026-09-24 10:11:00',
        client_ref: 'TU_154100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 33,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:36 PM',
        dateUtc: '2026-09-24 10:06:00',
        client_ref: 'TU_153600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 35,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:34 PM',
        dateUtc: '2026-09-24 10:04:00',
        client_ref: 'TU_153400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8830,
        is_reversal: false
      },
      {
        sno: 46,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 3:28 PM',
        dateUtc: '2026-09-24 09:58:00',
        client_ref: 'STMT_152800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1520,
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

    console.log('\n================ BATCH 62 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 62 insert:', err);
    process.exit(1);
  }
}

main();
