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

    // 10 logs from user screenshots (Thu, Sep 24, 2026 2:10 PM - 2:57 PM):
    // 1.  Image 1 - SNo. 52: Transunion Credit Report V5 (Dr) @ 2:57 PM IST -> UTC 2026-09-24 09:27:00
    // 2.  Image 2 - SNo. 61: statement-analyzer (Dr) @ 2:47 PM IST -> UTC 2026-09-24 09:17:00
    // 3.  Image 2 - SNo. 68: Transunion Credit Report V5 (Dr) @ 2:38 PM IST -> UTC 2026-09-24 09:08:00
    // 4.  Image 3 - SNo. 76: Crif High Mark Credit Report V4 (Dr) @ 2:29 PM IST -> UTC 2026-09-24 08:59:00
    // 5.  Image 3 - SNo. 80: Transunion Credit Report V5 (Dr) @ 2:29 PM IST -> UTC 2026-09-24 08:59:00
    // 6.  Image 4 - SNo. 81: Transunion Credit Report V5 (Dr) @ 2:29 PM IST -> UTC 2026-09-24 08:59:00
    // 7.  Image 5 - SNo. 93: Crif High Mark Credit Report V4 (Dr) @ 2:16 PM IST -> UTC 2026-09-24 08:46:00
    // 8.  Image 5 - SNo. 94: Crif High Mark Credit Report V4 (Dr) @ 2:16 PM IST -> UTC 2026-09-24 08:46:00
    // 9.  Image 5 - SNo. 98: Crif High Mark Credit Report V4 (Dr) @ 2:12 PM IST -> UTC 2026-09-24 08:42:00
    // 10. Image 5 - SNo. 99: Crif High Mark Credit Report V4 (Dr) @ 2:10 PM IST -> UTC 2026-09-24 08:40:00

    const logsToInsert = [
      {
        sno: 52,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:57 PM',
        dateUtc: '2026-09-24 09:27:00',
        client_ref: 'TU_145700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8840,
        is_reversal: false
      },
      {
        sno: 61,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:47 PM',
        dateUtc: '2026-09-24 09:17:00',
        client_ref: 'STMT_144700_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1460,
        is_reversal: false
      },
      {
        sno: 68,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:38 PM',
        dateUtc: '2026-09-24 09:08:00',
        client_ref: 'TU_143800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8760,
        is_reversal: false
      },
      {
        sno: 76,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:29 PM',
        dateUtc: '2026-09-24 08:59:00',
        client_ref: 'CRF_142901_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5890,
        is_reversal: false
      },
      {
        sno: 80,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:29 PM',
        dateUtc: '2026-09-24 08:59:00',
        client_ref: 'TU_142902_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8910,
        is_reversal: false
      },
      {
        sno: 81,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:29 PM',
        dateUtc: '2026-09-24 08:59:00',
        client_ref: 'TU_142903_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8880,
        is_reversal: false
      },
      {
        sno: 93,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:16 PM',
        dateUtc: '2026-09-24 08:46:00',
        client_ref: 'CRF_141601_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5920,
        is_reversal: false
      },
      {
        sno: 94,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:16 PM',
        dateUtc: '2026-09-24 08:46:00',
        client_ref: 'CRF_141602_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5860,
        is_reversal: false
      },
      {
        sno: 98,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:12 PM',
        dateUtc: '2026-09-24 08:42:00',
        client_ref: 'CRF_141200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5970,
        is_reversal: false
      },
      {
        sno: 99,
        name: 'Crif High Mark Credit Report V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Thu, Sep 24, 2026, 2:10 PM',
        dateUtc: '2026-09-24 08:40:00',
        client_ref: 'CRF_141000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 5840,
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

    console.log('\n================ BATCH 61 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 61 insert:', err);
    process.exit(1);
  }
}

main();
