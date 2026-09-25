import { dbPool } from '../core/config/db.config.js';

async function run() {
  try {
    const [users] = await dbPool.query('SELECT * FROM users');
    console.log('=== USERS ===');
    console.table(users);

    const [tables] = await dbPool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('=== ALL TABLES ===', tableNames);

    const [creds] = await dbPool.query('SELECT * FROM api_credentials WHERE user_id = 3');
    console.log('=== USER 3 CREDENTIALS ===');
    console.table(creds);

    const [hitLogsCols] = await dbPool.query('DESCRIBE api_hit_logs');
    console.log('=== api_hit_logs columns ===');
    console.table(hitLogsCols.map(c => ({ Field: c.Field, Type: c.Type })));

    const [recentHitLogs] = await dbPool.query('SELECT * FROM api_hit_logs ORDER BY created_at DESC LIMIT 10');
    console.log('=== RECENT api_hit_logs ===');
    console.table(recentHitLogs);

    const [txCols] = await dbPool.query('DESCRIBE wallet_transactions');
    console.log('=== wallet_transactions columns ===');
    console.table(txCols.map(c => ({ Field: c.Field, Type: c.Type })));

    const [recentTxs] = await dbPool.query('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 10');
    console.log('=== RECENT wallet_transactions ===');
    console.table(recentTxs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
