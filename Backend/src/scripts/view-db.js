import { dbPool } from '../core/config/db.config.js';

async function viewDatabase() {
  try {
    console.log('\n==================== 📊 BHARAT API CLOUD DATABASE 📊 ====================');
    
    // Fetch users
    const [users] = await dbPool.query(
      'SELECT id, name, company_name, email, plan, role, wallet_balance, onboarded, is_active, created_at FROM users ORDER BY id ASC'
    );
    console.log(`\n👥 Users Table (${users.length} record${users.length === 1 ? '' : 's'}):`);
    if (users.length > 0) console.table(users);
    else console.log('⚠️ No records found in users table.');

    // Fetch api_credentials
    const [creds] = await dbPool.query(
      'SELECT id, user_id, api_id, api_key, token_id_preview, environment, label, status, created_at, last_used_at FROM api_credentials ORDER BY id DESC'
    );
    console.log(`\n🔑 API Credentials Table (${creds.length} record${creds.length === 1 ? '' : 's'}):`);
    if (creds.length > 0) console.table(creds);
    else console.log('⚠️ No records found in api_credentials table.');

    // Fetch api_hit_logs
    const [logs] = await dbPool.query(
      'SELECT id, user_id, endpoint, method, request_id, client_ref_num, status_code, result_code, latency_ms, cost, environment, created_at FROM api_hit_logs ORDER BY id DESC LIMIT 10'
    );
    console.log(`\n📊 Recent API Hit Logs (${logs.length} record${logs.length === 1 ? '' : 's'}):`);
    if (logs.length > 0) console.table(logs);
    else console.log('⚠️ No records found in api_hit_logs table.');

    // Fetch wallet_transactions
    const [txns] = await dbPool.query(
      'SELECT id, user_id, type, amount, balance_after, category, description, reference_id, created_at FROM wallet_transactions ORDER BY id DESC LIMIT 10'
    );
    console.log(`\n💳 Wallet Transactions (${txns.length} record${txns.length === 1 ? '' : 's'}):`);
    if (txns.length > 0) console.table(txns);
    else console.log('⚠️ No records found in wallet_transactions table.');

    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Error reading database:', error.message);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

viewDatabase();
