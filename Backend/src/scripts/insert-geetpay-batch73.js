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
    const priceTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId); // 88.50 (Base ₹75.00 + 18% GST)
    const priceStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId); // 29.50 (Base ₹25.00 + 18% GST)

    console.log(`Platform Pricing for loan@geetpay.in:`);
    console.log(`- TransUnion CIBIL V5: ₹${priceTU.toFixed(2)}`);
    console.log(`- Statement Analyzer V2: ₹${priceStmt.toFixed(2)}`);

    // Logs to insert from user screenshots (Fri, Sep 25, 2026):
    // 1. Row 26: Transunion Credit Report V5 @ 4:42 PM IST -> UTC 2026-09-25 11:12:00
    // 2. Row 23: Transunion Credit Report V5 @ 4:49 PM IST -> UTC 2026-09-25 11:19:00
    // 3. Row 16: statement-analyzer @ 4:59 PM IST -> UTC 2026-09-25 11:29:00

    const logsToInsert = [
      {
        sno: 26,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 25, 2026, 4:42 PM',
        dateUtc: '2026-09-25 11:12:00',
        client_ref: 'TU_164200_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8820,
        is_reversal: false
      },
      {
        sno: 23,
        name: 'Transunion Credit Report V5',
        endpoint: '/srv5/transunion-Score-Hybrid',
        method: 'POST',
        ist_display: 'Fri, Sep 25, 2026, 4:49 PM',
        dateUtc: '2026-09-25 11:19:00',
        client_ref: 'TU_164900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceTU,
        status_code: 200,
        result_code: 101,
        latency_ms: 8780,
        is_reversal: false
      },
      {
        sno: 16,
        name: 'statement-analyzer',
        endpoint: '/srv2/statement-analyzer',
        method: 'POST',
        ist_display: 'Fri, Sep 25, 2026, 4:59 PM',
        dateUtc: '2026-09-25 11:29:00',
        client_ref: 'STMT_165900_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cost: priceStmt,
        status_code: 200,
        result_code: 101,
        latency_ms: 1470,
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
      console.log(`[INSERTED ID: ${res.insertId} | SNo. ${log.sno}] ${log.name} at IST ${log.ist_display} (UTC ${log.dateUtc}) | Platform Cost: ₹${actualDeductionCost.toFixed(2)}`);
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

    console.log('\n================ BATCH 73 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: ${logsToInsert.length}`);
    console.log(`Total Wallet Deduction: -₹${totalDeduction.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.table(insertedRecords);
    console.log('====================================================================\n');

    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing batch 73 insert:', err);
    process.exit(1);
  }
}

main();
