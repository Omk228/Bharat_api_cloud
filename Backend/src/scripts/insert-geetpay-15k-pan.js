import 'dotenv/config';
import crypto from 'node:crypto';
import { dbPool } from '../core/config/db.config.js';

async function main() {
  try {
    console.log(`\n===============================================================`);
    console.log(`EXECUTING 15,000 PAN LOGS INSERTION (2-SECOND WINDOW)`);
    console.log(`===============================================================\n`);

    // 1. Fetch user loan@geetpay.in
    const [userRows] = await dbPool.query(
      'SELECT id, name, company_name, email, wallet_balance FROM users WHERE email = ?',
      ['loan@geetpay.in']
    );

    if (!userRows || userRows.length === 0) {
      console.error('❌ User not found: loan@geetpay.in');
      process.exit(1);
    }

    const user = userRows[0];
    const userId = user.id;
    const startingBalance = parseFloat(user.wallet_balance || '0.00');

    console.log(`Target User: ${user.name} (${user.email}) | ID: ${userId}`);
    console.log(`Live Starting Balance: ₹${startingBalance.toFixed(2)}`);

    // 2. Fetch credential ID
    const [creds] = await dbPool.query(
      'SELECT id FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId]
    );
    const credentialId = creds && creds.length > 0 ? creds[0].id : 3;

    // 3. Exact 15,000 requests allocation
    const TOTAL_REQUESTS = 15000;
    const balanceInCents = Math.round(startingBalance * 100);
    const baseCents = Math.floor(balanceInCents / TOTAL_REQUESTS);
    const remainderCents = balanceInCents - (baseCents * TOTAL_REQUESTS);

    const highCost = (baseCents + 1) / 100;
    const lowCost = baseCents / 100;
    const highCostHits = remainderCents;
    const lowCostHits = TOTAL_REQUESTS - remainderCents;

    console.log(`\nCost Allocation for ${TOTAL_REQUESTS} PAN Hits:`);
    console.log(`- ${highCostHits} hits @ ₹${highCost.toFixed(2)} = ₹${(highCostHits * highCost).toFixed(2)}`);
    console.log(`- ${lowCostHits} hits @ ₹${lowCost.toFixed(2)} = ₹${(lowCostHits * lowCost).toFixed(2)}`);
    const totalDeducted = (highCostHits * highCost) + (lowCostHits * lowCost);
    console.log(`Total Deducted from Hits: ₹${totalDeducted.toFixed(2)} (Matches ₹${startingBalance.toFixed(2)})`);

    // 4. Exact 2-second timestamp window at current execution time
    const now = new Date();
    const sec1 = new Date(now.getTime());
    const sec2 = new Date(now.getTime() + 1000);

    const sec1Utc = sec1.toISOString().replace('T', ' ').slice(0, 19);
    const sec2Utc = sec2.toISOString().replace('T', ' ').slice(0, 19);

    const ist1 = sec1.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const ist2 = sec2.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    console.log(`\nTimestamp Window (Exact 2 Seconds):`);
    console.log(`Second 1: ${ist1} (${sec1Utc} UTC) -> 7,500 requests`);
    console.log(`Second 2: ${ist2} (${sec2Utc} UTC) -> 7,500 requests`);

    // 5. Generate 15,000 PAN log rows
    console.log(`\nGenerating 15,000 PAN Details Plus rows...`);
    const allRows = [];

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const reqId = `REQ_${crypto.randomUUID()}`;
      const clientRef = `GP-PAN-${String(i + 1).padStart(6, '0')}`;
      const latency = Math.floor(1800 + Math.random() * 800);
      const hitCost = i < highCostHits ? highCost : lowCost;
      const timestamp = i < 7500 ? sec1Utc : sec2Utc;

      allRows.push([
        userId,
        credentialId,
        '/srv2/validation/pan/plus',
        'POST',
        reqId,
        clientRef,
        200,
        101,
        latency,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        hitCost,
        'production',
        timestamp
      ]);
    }

    // 6. Bulk insert in chunks of 1,000
    const CHUNK_SIZE = 1000;
    console.log(`Inserting into api_hit_logs in chunks of ${CHUNK_SIZE}...`);
    for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
      const chunk = allRows.slice(i, i + CHUNK_SIZE);
      await dbPool.query(
        `INSERT INTO api_hit_logs (
          user_id, credential_id, endpoint, method, request_id,
          client_ref_num, status_code, result_code, latency_ms,
          client_ip, cost, environment, created_at
        ) VALUES ?`,
        [chunk]
      );
      process.stdout.write(`.` );
    }
    console.log(`\n✅ All 15,000 logs inserted successfully!`);

    // 7. Set wallet balance to 0.00
    await dbPool.query(
      'UPDATE users SET wallet_balance = 0.00 WHERE id = ?',
      [userId]
    );

    const [verifyUser] = await dbPool.query(
      'SELECT id, email, wallet_balance FROM users WHERE id = ?',
      [userId]
    );

    console.log(`\n===============================================================`);
    console.log(`🎉 EXECUTION COMPLETE:`);
    console.log(`- Account: ${verifyUser[0].email}`);
    console.log(`- Total PAN Requests Inserted: ${TOTAL_REQUESTS.toLocaleString('en-IN')}`);
    console.log(`- Service / Endpoint: Pan Details Plus (/srv2/validation/pan/plus)`);
    console.log(`- Window: 2 seconds (${ist1} to ${ist2})`);
    console.log(`- Total Amount Deducted: ₹${totalDeducted.toFixed(2)}`);
    console.log(`- Final Wallet Balance: ₹${parseFloat(verifyUser[0].wallet_balance).toFixed(2)}`);
    console.log(`===============================================================\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error executing 15k PAN logs insert:', err);
    process.exit(1);
  }
}

main();
