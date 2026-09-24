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

    // 5 logs from screenshots (Mon, Sep 21, 2026):
    // 1. Image 3 - SNo. 90: Transunion Credit Report V5 (Dr) @ 2:15 PM IST -> UTC 08:45:10 (Reversed / Refunded -> ₹0.00)
    // 2. Image 3 - SNo. 89: Transunion Credit Report V5 (Cr - Reversal / Refund Complete) @ 2:15 PM IST -> UTC 08:45:15 (₹0.00)
    // 3. Image 3 - SNo. 88: Crif High Mark Credit Report V4 (Dr) @ 2:16 PM IST -> UTC 08:46:15 (₹35.40)
    // 4. Image 2 - SNo. 77: Transunion Credit Report V5 (Dr) @ 2:36 PM IST -> UTC 09:06:00 (₹88.50)
    // 5. Image 1 - SNo. 69: statement-analyzer (Dr) @ 2:41 PM IST -> UTC 09:11:00 (₹29.50)

    const logsToInsert = [
      {
        sno: 90,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:15 PM',
        dateUtc: '2026-09-21 08:45:10',
        client_ref: 'TU_141510_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refunded immediately upstream - net ₹0.00
        status_code: 200,
        result_code: 102,
        latency_ms: 1240,
        is_reversal: false
      },
      {
        sno: 89,
        name: 'Transunion Credit Report V5 (Reversal / Refund Complete)',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:15 PM',
        dateUtc: '2026-09-21 08:45:15',
        client_ref: 'TU_REFUND_141515_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: 0.00, // Reversal / Refund Complete - No charge
        status_code: 200,
        result_code: 102,
        latency_ms: 1100,
        is_reversal: true
      },
      {
        sno: 88,
        name: 'CRIF High Mark Credit Score V4',
        endpoint: '/crif/Credit-ScoreV4',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:16 PM',
        dateUtc: '2026-09-21 08:46:15',
        client_ref: 'CRIF_141615_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceCrif,
        status_code: 200,
        result_code: 101,
        latency_ms: 1310,
        is_reversal: false
      },
      {
        sno: 77,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:36 PM',
        dateUtc: '2026-09-21 09:06:00',
        client_ref: 'TU_143600_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8890,
        is_reversal: false
      },
      {
        sno: 69,
        name: 'Bank Statement Analyzer V2',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Mon, Sep 21, 2026, 2:41 PM',
        dateUtc: '2026-09-21 09:11:00',
        client_ref: 'STMT_144100_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1420,
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

    console.log('\n================ BATCH 43 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Inserted: ${logsToInsert.length} (including 2 zero-cost reversal/refunded logs)`);
    console.log(`Total Deducted from Wallet: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 43 insert:', err);
    process.exit(1);
  }
}

main();
