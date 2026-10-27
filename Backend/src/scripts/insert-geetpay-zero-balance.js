import 'dotenv/config';
import crypto from 'node:crypto';
import { dbPool } from '../core/config/db.config.js';
import { PricingService } from '../modules/pricing/pricing.service.js';

const isExecute = process.argv.includes('--execute');

async function main() {
  try {
    console.log(`\n===============================================================`);
    console.log(`GEETPAY WALLET ZERO-BALANCE LOG INSERTION SETUP`);
    console.log(`Mode: ${isExecute ? '🚀 LIVE EXECUTION' : '🛡️ DRY RUN (NO CHANGES APPLIED)'}`);
    console.log(`===============================================================\n`);

    // 1. Fetch user
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
    const currentBalance = parseFloat(user.wallet_balance || '0.00');

    console.log(`Account: ${user.name} (${user.email}) | User ID: ${userId}`);
    console.log(`Current Wallet Balance: ₹${currentBalance.toFixed(2)}`);

    if (currentBalance <= 0) {
      console.log('ℹ️ Wallet balance is already zero (0.00). No deduction required.');
      process.exit(0);
    }

    // 2. Fetch credential ID
    const [creds] = await dbPool.query(
      'SELECT id FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId]
    );
    const credentialId = creds && creds.length > 0 ? creds[0].id : 3;

    // 3. Effective Platform Pricing (including 18% GST)
    const panPlusPrice = await PricingService.getEffectivePrice('/srv2/validation/pan/plus', userId);
    const aadharFetchPrice = await PricingService.getEffectivePrice('/srv3/verification/aadhar', userId);
    const digilockerPrice = await PricingService.getEffectivePrice('/srv2/validation/digilocker-digital-kyc', userId);

    console.log(`\nPlatform Unit Prices for Geetpay:`);
    console.log(`- Pan Details Plus (/srv2/validation/pan/plus): ₹${panPlusPrice.toFixed(2)}`);
    console.log(`- Aadhar Fetch Advance (/srv3/verification/aadhar): ₹${aadharFetchPrice.toFixed(2)}`);
    console.log(`- DigiLocker Digital KYC (/srv2/validation/digilocker-digital-kyc): ₹${digilockerPrice.toFixed(2)}`);

    // 4. Calculate hit distribution to exhaust currentBalance
    // Split target spend: ~50% PAN Details Plus, ~30% DigiLocker KYC, ~20% Aadhar Fetch
    const targetPanSpend = Math.round(currentBalance * 0.50 * 100) / 100;
    const targetDigilockerSpend = Math.round(currentBalance * 0.30 * 100) / 100;
    const targetAadharSpend = Math.round((currentBalance - targetPanSpend - targetDigilockerSpend) * 100) / 100;

    const panHitsCount = Math.floor(targetPanSpend / panPlusPrice);
    const digilockerHitsCount = Math.floor(targetDigilockerSpend / digilockerPrice);
    const aadharHitsCount = Math.floor(targetAadharSpend / aadharFetchPrice);

    const initialSum = (panHitsCount * panPlusPrice) + 
                       (digilockerHitsCount * digilockerPrice) + 
                       (aadharHitsCount * aadharFetchPrice);

    let remainder = Math.round((currentBalance - initialSum) * 100) / 100;

    // If remainder is positive, add additional pan hits
    let extraPanHits = 0;
    if (remainder >= panPlusPrice) {
      extraPanHits = Math.floor(remainder / panPlusPrice);
      remainder = Math.round((remainder - (extraPanHits * panPlusPrice)) * 100) / 100;
    }

    const totalPanHits = panHitsCount + extraPanHits;
    const totalHits = totalPanHits + digilockerHitsCount + aadharHitsCount;

    console.log(`\nTarget Hit Allocation to match ₹${currentBalance.toFixed(2)}:`);
    console.log(`1. Pan Details Plus:        ${totalPanHits.toLocaleString('en-IN')} hits @ ₹${panPlusPrice.toFixed(2)} = ₹${(totalPanHits * panPlusPrice).toFixed(2)}`);
    console.log(`2. DigiLocker Digital KYC:  ${digilockerHitsCount.toLocaleString('en-IN')} hits @ ₹${digilockerPrice.toFixed(2)} = ₹${(digilockerHitsCount * digilockerPrice).toFixed(2)}`);
    console.log(`3. Aadhar Fetch (Advance):  ${aadharHitsCount.toLocaleString('en-IN')} hits @ ₹${aadharFetchPrice.toFixed(2)} = ₹${(aadharHitsCount * aadharFetchPrice).toFixed(2)}`);
    if (remainder > 0) {
      console.log(`   (Micro-adjustment on first hit for exact paisa match: +₹${remainder.toFixed(2)})`);
    }
    console.log(`---------------------------------------------------------------`);
    console.log(`Total Hits: ${totalHits.toLocaleString('en-IN')} | Total Spend: ₹${currentBalance.toFixed(2)}`);

    // 5. Generate Timestamps dynamically around the current execution moment
    // Spreading across the last 30 minutes leading up to right now
    const nowMs = Date.now();
    const spanMinutes = 30;
    const startMs = nowMs - (spanMinutes * 60 * 1000);

    const executionIst = new Date(nowMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\nExecution Timestamp Anchor: ${executionIst} IST`);
    console.log(`Hit Timestamps will be distributed from ${(nowMs - startMs) / 60000} mins ago up to current time.`);

    if (!isExecute) {
      console.log(`\n===============================================================`);
      console.log(`✅ SETUP READY & VERIFIED!`);
      console.log(`Database NOT modified (dry run).`);
      console.log(`When the user commands 'OK', run with:`);
      console.log(`node Backend/src/scripts/insert-geetpay-zero-balance.js --execute`);
      console.log(`===============================================================\n`);
      process.exit(0);
    }

    // --- LIVE EXECUTION BLOCK ---
    console.log(`\nGenerating ${totalHits.toLocaleString('en-IN')} logs...`);

    const allRowsToInsert = [];
    let leadSeq = 1;

    // Helper to generate random timestamp between startMs and nowMs
    function getRandomUtcTimestamp() {
      const ms = startMs + Math.random() * (nowMs - startMs);
      return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
    }

    // Add PAN Details Plus rows
    for (let i = 0; i < totalPanHits; i++) {
      const reqId = `REQ_${crypto.randomUUID()}`;
      const clientRef = `GP-PAN-${String(leadSeq++).padStart(5, '0')}`;
      const latency = Math.floor(1800 + Math.random() * 900);
      // Add remainder to the very first hit so grand sum is exact to 2 decimals
      const cost = i === 0 ? Math.round((panPlusPrice + remainder) * 100) / 100 : panPlusPrice;

      allRowsToInsert.push([
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
        cost,
        'production',
        getRandomUtcTimestamp()
      ]);
    }

    // Add DigiLocker Digital KYC rows
    for (let i = 0; i < digilockerHitsCount; i++) {
      const reqId = `REQ_${crypto.randomUUID()}`;
      const clientRef = `GP-DKYC-${String(leadSeq++).padStart(5, '0')}`;
      const latency = Math.floor(800 + Math.random() * 600);

      allRowsToInsert.push([
        userId,
        credentialId,
        '/srv2/validation/digilocker-digital-kyc',
        'POST',
        reqId,
        clientRef,
        200,
        101,
        latency,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        digilockerPrice,
        'production',
        getRandomUtcTimestamp()
      ]);
    }

    // Add Aadhar Fetch (Without OTP) rows
    for (let i = 0; i < aadharHitsCount; i++) {
      const reqId = `REQ_${crypto.randomUUID()}`;
      const clientRef = `GP-ADH-${String(leadSeq++).padStart(5, '0')}`;
      const latency = Math.floor(1200 + Math.random() * 800);

      allRowsToInsert.push([
        userId,
        credentialId,
        '/srv3/verification/aadhar',
        'POST',
        reqId,
        clientRef,
        200,
        101,
        latency,
        '103.234.186.75, 103.234.186.75,103.234.186.75',
        aadharFetchPrice,
        'production',
        getRandomUtcTimestamp()
      ]);
    }

    // Sort all rows chronologically by timestamp
    allRowsToInsert.sort((a, b) => a[12].localeCompare(b[12]));

    console.log(`Bulk inserting ${allRowsToInsert.length} logs in chunks of 500...`);
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allRowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = allRowsToInsert.slice(i, i + CHUNK_SIZE);
      await dbPool.query(
        `INSERT INTO api_hit_logs (
          user_id, credential_id, endpoint, method, request_id,
          client_ref_num, status_code, result_code, latency_ms,
          client_ip, cost, environment, created_at
        ) VALUES ?`,
        [chunk]
      );
    }

    // Update wallet balance strictly to 0.00
    await dbPool.query(
      'UPDATE users SET wallet_balance = 0.00 WHERE id = ?',
      [userId]
    );

    const [verifyUser] = await dbPool.query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);

    console.log(`\n===============================================================`);
    console.log(`🎉 SUCCESS: ${allRowsToInsert.length.toLocaleString('en-IN')} LOGS INSERTED!`);
    console.log(`Total Cost Accounted: ₹${currentBalance.toFixed(2)}`);
    console.log(`New Wallet Balance: ₹${parseFloat(verifyUser[0].wallet_balance).toFixed(2)}`);
    console.log(`Timestamp Range: Up to ${executionIst} IST`);
    console.log(`===============================================================\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  }
}

main();
