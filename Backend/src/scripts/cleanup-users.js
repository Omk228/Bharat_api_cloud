import db from '../core/config/db.config.js';

async function cleanup() {
  const fundLeloEmail = 'aman@fundlelo.in';
  
  // 1. Verify Fund Lelo exists
  const [targetUsers] = await db.query('SELECT * FROM users WHERE email = ?', [fundLeloEmail]);
  if (targetUsers.length === 0) {
    throw new Error(`Fund Lelo user with email ${fundLeloEmail} not found! Aborting cleanup.`);
  }

  const fundLeloUser = targetUsers[0];
  const fundLeloId = fundLeloUser.id;
  console.log(`\nPreserving target user: ID ${fundLeloId} (${fundLeloUser.name} - ${fundLeloUser.email})\n`);

  // Start Transaction
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 2. Delete non-target user records in dependent tables
    const [hitLogsRes] = await conn.query('DELETE FROM api_hit_logs WHERE user_id != ? OR user_id IS NULL', [fundLeloId]);
    console.log(`Deleted ${hitLogsRes.affectedRows} records from api_hit_logs`);

    const [pricingRes] = await conn.query('DELETE FROM user_api_pricing WHERE user_id != ?', [fundLeloId]);
    console.log(`Deleted ${pricingRes.affectedRows} records from user_api_pricing`);

    const [gatewayRes] = await conn.query('DELETE FROM gateway_logs WHERE user_id != ?', [String(fundLeloId)]);
    console.log(`Deleted ${gatewayRes.affectedRows} records from gateway_logs`);

    const [credsRes] = await conn.query('DELETE FROM credentials WHERE user_id != ?', [String(fundLeloId)]);
    console.log(`Deleted ${credsRes.affectedRows} records from credentials`);

    const [auditRes] = await conn.query('DELETE FROM audit_trail WHERE user_id != ?', [String(fundLeloId)]);
    console.log(`Deleted ${auditRes.affectedRows} records from audit_trail`);

    // 3. Delete from users table (cascades to api_credentials, wallet_transactions, ip_whitelist)
    const [usersRes] = await conn.query('DELETE FROM users WHERE id != ?', [fundLeloId]);
    console.log(`Deleted ${usersRes.affectedRows} records from users`);

    await conn.commit();
    console.log('\n Cleanup transaction committed successfully!\n');
  } catch (err) {
    await conn.rollback();
    console.error('Transaction failed, rolled back:', err);
    throw err;
  } finally {
    conn.release();
  }

  // 4. Verify remaining data
  const [remainingUsers] = await db.query('SELECT id, name, email, company_name, wallet_balance, role FROM users');
  console.log('=== REMAINING USERS ===');
  console.log(JSON.stringify(remainingUsers, null, 2));

  const [remainingCreds] = await db.query('SELECT id, user_id, api_id, status, label FROM api_credentials');
  console.log('\n=== REMAINING API CREDENTIALS ===');
  console.log(JSON.stringify(remainingCreds, null, 2));

  const [remainingPricing] = await db.query('SELECT id, user_id, catalog_id, custom_price, is_assigned FROM user_api_pricing');
  console.log('\n=== REMAINING USER API PRICING ===');
  console.log(JSON.stringify(remainingPricing, null, 2));

  const [remainingTx] = await db.query('SELECT COUNT(*) as count FROM wallet_transactions');
  console.log('\n=== REMAINING WALLET TRANSACTIONS COUNT ===');
  console.log(`Total: ${remainingTx[0].count} for User ${fundLeloId}`);

  process.exit(0);
}

cleanup().catch(e => {
  console.error(e);
  process.exit(1);
});
