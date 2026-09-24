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

    // Get Platform Pricing for Transunion Credit Report V5
    const platformCost = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId);
    console.log(`Platform Pricing for Transunion V5: ₹${platformCost.toFixed(2)} (Base ₹75.00 + 18% GST)`);

    // Log from screenshot (Mon, Sep 21, 2026, 11:00 AM IST):
    // SNo. 3: Transunion Credit Report V5 @ Mon, Sep 21, 2026, 11:00 AM IST -> UTC 2026-09-21 05:30:00
    const logToInsert = {
      sno: 3,
      name: 'Transunion Credit Report V5',
      endpoint: '/srv5/transunion-Score-Hybrid',
      method: 'POST',
      ist_display: 'Mon, Sep 21, 2026, 11:00 AM',
      dateUtc: '2026-09-21 05:30:00',
      client_ref: 'TU_110000_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      cost: platformCost, // ₹88.50
      status_code: 200,
      result_code: 101,
      latency_ms: 8870
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
      [platformCost, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    console.log('\n================ BATCH 37 INSERT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Service: Transunion Credit Report V5`);
    console.log(`Timestamp: Mon, Sep 21, 2026, 11:00 AM IST`);
    console.log(`Platform Cost Deducted: -₹${platformCost.toFixed(2)}`);
    console.log(`Previous Balance: ₹${startingBalance.toFixed(2)} -> Updated Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('====================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 37 insert:', err);
    process.exit(1);
  }
}

main();
