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

    // Logs from user screenshots:
    // 1. SNo. 103: Transunion Credit Report V5 (Dr) @ Thu, Sep 24, 2026, 12:09 PM IST -> UTC 2026-09-24 06:39:00
    // 2. SNo. 63:  Crif High Mark Credit Report V4 (Dr) @ Thu, Sep 24, 2026, 12:55 PM IST -> UTC 2026-09-24 07:25:00
    // 3. SNo. 58:  Transunion Credit Report V5 (Dr) @ Thu, Sep 24, 2026, 12:59 PM IST -> UTC 2026-09-24 07:29:00
    // 4. SNo. 53:  Transunion Credit Report V5 (Dr) @ Thu, Sep 24, 2026, 1:06 PM IST -> UTC 2026-09-24 07:36:00
    // 5. SNo. 41:  Crif High Mark Credit Report V4 (Dr) @ Thu, Sep 24, 2026, 1:21 PM IST -> UTC 2026-09-24 07:51:00
    // 6. SNo. 34:  Transunion Credit Report V5 (Dr) @ Thu, Sep 24, 2026, 1:25 PM IST -> UTC 2026-09-24 07:55:00
    // 7. SNo. 33:  Crif High Mark Credit Report V4 (Dr) @ Thu, Sep 24, 2026, 1:26 PM IST -> UTC 2026-09-24 07:56:00

    const logsToInsert = [
      {
        sno: 103,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 12:09 PM',
        dateUtc: '2026-09-24 06:39:00',
        client_ref: 'TU_120900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8420,
        is_reversal: false
      },
      {
        sno: 63,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 12:55 PM',
        dateUtc: '2026-09-24 07:25:00',
        client_ref: 'CRF_125500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5820,
        is_reversal: false
      },
      {
        sno: 58,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 12:59 PM',
        dateUtc: '2026-09-24 07:29:00',
        client_ref: 'TU_125900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 7950,
        is_reversal: false
      },
      {
        sno: 53,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 1:06 PM',
        dateUtc: '2026-09-24 07:36:00',
        client_ref: 'TU_130600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8120,
        is_reversal: false
      },
      {
        sno: 41,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 1:21 PM',
        dateUtc: '2026-09-24 07:51:00',
        client_ref: 'CRF_132100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5640,
        is_reversal: false
      },
      {
        sno: 34,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 1:25 PM',
        dateUtc: '2026-09-24 07:55:00',
        client_ref: 'TU_132500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8630,
        is_reversal: false
      },
      {
        sno: 33,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 1:26 PM',
        dateUtc: '2026-09-24 07:56:00',
        client_ref: 'CRF_132600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5910,
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

    console.log('\n================ BATCH 59 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 59 insert:', err);
    process.exit(1);
  }
}

main();
