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
    console.log(`Platform Pricing: Transunion: ₹${priceTU.toFixed(2)}`);

    // 1 log from screenshot:
    // Image: SNo. 72: Transunion Credit Report V5 (Dr) @ 10:28 AM IST -> UTC 04:58:00 (₹88.50)
    const logToInsert = {
      sno: 72,
      name: 'Transunion Credit Report V5',
      endpoint: '/srv5/transunion-Score-Hybrid',
      method: 'POST',
      ist_display: 'Wed, Sep 23, 2026, 10:28 AM',
      dateUtc: '2026-09-23 04:58:00',
      client_ref: 'TU_102800_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      cost: priceTU,
      status_code: 200,
      result_code: 101,
      latency_ms: 8890,
      is_reversal: false
    };

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
        logToInsert.endpoint,
        logToInsert.method,
        requestId,
        logToInsert.client_ref,
        logToInsert.status_code,
        logToInsert.result_code,
        logToInsert.latency_ms,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        logToInsert.cost,
        'production',
        logToInsert.dateUtc
      ]
    );

    console.log(`[INSERTED ID: ${res.insertId} | SNo. ${logToInsert.sno}] ${logToInsert.name} at IST ${logToInsert.ist_display} (UTC ${logToInsert.dateUtc}) | Cost: ₹${logToInsert.cost.toFixed(2)}`);

    // Deduct from wallet balance
    await dbPool.query(
      'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
      [logToInsert.cost, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 52 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total Logs Processed: 1`);
    console.log(`Total Wallet Deduction: -₹${logToInsert.cost.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 52 insert:', err);
    process.exit(1);
  }
}

main();
