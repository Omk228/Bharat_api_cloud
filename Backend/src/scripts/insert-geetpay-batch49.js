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

    // 12 logs from screenshots (Tue, Sep 22, 2026 late afternoon):
    // 1. Image 5 - SNo. 64: Transunion Credit Report V5 (Dr) @ 4:02 PM IST -> UTC 10:32:00 (₹88.50)
    // 2. Image 5 - SNo. 63: Transunion Credit Report V5 (Dr) @ 4:22 PM IST -> UTC 10:52:00 (₹88.50)
    // 3. Image 5 - SNo. 61: Transunion PDF Report (Dr) @ 4:23 PM IST -> UTC 10:53:00 (₹88.50)
    // 4. Image 4 - SNo. 60: Crif High Mark Credit Report V4 (Dr) @ 4:23 PM IST -> UTC 10:53:15 (₹35.40)
    // 5. Image 4 - SNo. 59: Transunion Credit Report V5 (Dr) @ 4:23 PM IST -> UTC 10:53:30 (₹88.50)
    // 6. Image 3 - SNo. 35: Transunion Credit Report V5 (Dr) @ 4:55 PM IST -> UTC 11:25:00 (₹88.50)
    // 7. Image 3 - SNo. 34: Crif High Mark Credit Report V4 (Dr) @ 4:56 PM IST -> UTC 11:26:00 (₹35.40)
    // 8. Image 3 - SNo. 31: Transunion Credit Report V5 (Dr) @ 5:08 PM IST -> UTC 11:38:00 (₹88.50)
    // 9. Image 2 - SNo. 30: Crif High Mark Credit Report V4 (Dr) @ 5:08 PM IST -> UTC 11:38:15 (₹35.40)
    // 10. Image 2 - SNo. 25: Transunion Credit Report V5 (Dr) @ 5:11 PM IST -> UTC 11:41:00 (₹88.50)
    // 11. Image 2 - SNo. 24: Crif High Mark Credit Report V4 (Dr) @ 5:11 PM IST -> UTC 11:41:15 (₹35.40)
    // 12. Image 1 - SNo. 18: statement-analyzer (Dr) @ 5:25 PM IST -> UTC 11:55:00 (₹29.50)

    const logsToInsert = [
      {
        sno: 64,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:02 PM',
        dateUtc: '2026-09-22 10:32:00',
        client_ref: 'TU_160200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 63,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:22 PM',
        dateUtc: '2026-09-22 10:52:00',
        client_ref: 'TU_162200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 61,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:23 PM',
        dateUtc: '2026-09-22 10:53:00',
        client_ref: 'TU_PDF_162300_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8860,
        is_reversal: false
      },
      {
        sno: 60,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:23 PM',
        dateUtc: '2026-09-22 10:53:15',
        client_ref: 'CRIF_162315_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 59,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:23 PM',
        dateUtc: '2026-09-22 10:53:30',
        client_ref: 'TU_162330_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8920,
        is_reversal: false
      },
      {
        sno: 35,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:55 PM',
        dateUtc: '2026-09-22 11:25:00',
        client_ref: 'TU_165500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8850,
        is_reversal: false
      },
      {
        sno: 34,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 4:56 PM',
        dateUtc: '2026-09-22 11:26:00',
        client_ref: 'CRIF_165600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1320,
        is_reversal: false
      },
      {
        sno: 31,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 5:08 PM',
        dateUtc: '2026-09-22 11:38:00',
        client_ref: 'TU_170800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8940,
        is_reversal: false
      },
      {
        sno: 30,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 5:08 PM',
        dateUtc: '2026-09-22 11:38:15',
        client_ref: 'CRIF_170815_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1300,
        is_reversal: false
      },
      {
        sno: 25,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 5:11 PM',
        dateUtc: '2026-09-22 11:41:00',
        client_ref: 'TU_171100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8880,
        is_reversal: false
      },
      {
        sno: 24,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 5:11 PM',
        dateUtc: '2026-09-22 11:41:15',
        client_ref: 'CRIF_171115_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 18,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Tue, Sep 22, 2026, 5:25 PM',
        dateUtc: '2026-09-22 11:55:00',
        client_ref: 'STMT_172500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1430,
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

    console.log('\n================ BATCH 49 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 49 insert:', err);
    process.exit(1);
  }
}

main();
