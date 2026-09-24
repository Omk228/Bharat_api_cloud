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

    console.log(`Platform Pricing: Transunion: ₹${priceTU.toFixed(2)}, CRIF / Experian: ₹${priceCrif.toFixed(2)}`);

    // 11 logs from screenshots (Mon, Sep 21, 2026):
    // 1. Image 5 - SNo. 61: Transunion PDF Report (Dr) @ 2:44 PM IST -> UTC 09:14:00 (Reversed / Refunded -> ₹0.00)
    // 2. Image 4 - SNo. 60: Transunion PDF Report (Dr) @ 2:44 PM IST -> UTC 09:14:10 (Reversed / Refunded -> ₹0.00)
    // 3. Image 4 - SNo. 59: Transunion PDF Report (Cr - Reversal / Refund Complete) @ 2:44 PM IST -> UTC 09:14:15 (₹0.00)
    // 4. Image 4 - SNo. 58: Transunion Credit Report V5 (Dr) @ 2:44 PM IST -> UTC 09:14:25 (₹88.50)
    // 5. Image 4 - SNo. 57: Transunion PDF Report (Cr - Reversal / Refund Complete) @ 2:44 PM IST -> UTC 09:14:30 (₹0.00)
    // 6. Image 4 - SNo. 56: Transunion Credit Report V5 (Dr) @ 2:44 PM IST -> UTC 09:14:40 (₹88.50)
    // 7. Image 3 - SNo. 53: Experian Credit Report (Srv2) (Dr) @ 2:44 PM IST -> UTC 09:14:45 (₹35.40)
    // 8. Image 3 - SNo. 52: Experian Credit Report (Srv2) (Dr) @ 2:44 PM IST -> UTC 09:14:50 (₹35.40)
    // 9. Image 3 - SNo. 51: Crif High Mark Credit Report V4 (Dr) @ 2:45 PM IST -> UTC 09:15:10 (₹35.40)
    // 10. Image 2 - SNo. 50: Crif High Mark Credit Report V4 (Dr) @ 2:45 PM IST -> UTC 09:15:30 (₹35.40)
    // 11. Image 1 - SNo. 20: Transunion Credit Report V5 (Dr) @ 3:05 PM IST -> UTC 09:35:00 (₹88.50)

    const logsToInsert = [
      {
        sno: 61,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:00',
        client_ref: 'TU_PDF_144400_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refunded immediately upstream - net ₹0.00
        status_code: 200,
        result_code: 102,
        latency_ms: 1210,
        is_reversal: false
      },
      {
        sno: 60,
        name: 'Transunion PDF Report',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:10',
        client_ref: 'TU_PDF_144410_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refunded immediately upstream - net ₹0.00
        status_code: 200,
        result_code: 102,
        latency_ms: 1190,
        is_reversal: false
      },
      {
        sno: 59,
        name: 'Transunion PDF Report (Reversal / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:15',
        client_ref: 'TU_REFUND_144415_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - No charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1080,
        is_reversal: true
      },
      {
        sno: 58,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:25',
        client_ref: 'TU_144425_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8870,
        is_reversal: false
      },
      {
        sno: 57,
        name: 'Transunion PDF Report (Reversal / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:30',
        client_ref: 'TU_REFUND_144430_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - No charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1090,
        is_reversal: true
      },
      {
        sno: 56,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:40',
        client_ref: 'TU_144440_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8910,
        is_reversal: false
      },
      {
        sno: 53,
        name: 'Experian Credit Report (Srv2)',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:45',
        client_ref: 'EXP_144445_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1300,
        is_reversal: false
      },
      {
        sno: 52,
        name: 'Experian Credit Report (Srv2)',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:44 PM',
        dateUtc: '2026-09-21 09:14:50',
        client_ref: 'EXP_144450_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1290,
        is_reversal: false
      },
      {
        sno: 51,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:45 PM',
        dateUtc: '2026-09-21 09:15:10',
        client_ref: 'CRIF_144510_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 50,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:45 PM',
        dateUtc: '2026-09-21 09:15:30',
        client_ref: 'CRIF_144530_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1320,
        is_reversal: false
      },
      {
        sno: 20,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 3:05 PM',
        dateUtc: '2026-09-21 09:35:00',
        client_ref: 'TU_150500_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8880,
        is_reversal: false
      }
    ];

    let totalDeduction = 0;

    for (const log of logsToInsert) {
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
          log.cost,
          'production',
          log.dateUtc
        ]
      );
      totalDeduction += log.cost;
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Cost: ₹${log.cost.toFixed(2)}${log.is_reversal || log.cost === 0 ? ' (REFUND / NO DEDUCTION)' : ''}`);
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

    console.log('\n================ BATCH 42 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length} (including 4 zero-cost reversal/refunded logs)`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 42 insert:', err);
    process.exit(1);
  }
}

main();
