import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function analyze() {
  try {
    const [users] = await dbPool.query('SELECT id, name, company_name, email, wallet_balance FROM users');
    console.log('=== USERS ===');
    console.table(users);

    const geetpayUser = users.find(u => (u.email && u.email.includes('geetpay')) || (u.company_name && u.company_name.toLowerCase().includes('geetpay')));
    const userId = geetpayUser ? geetpayUser.id : 1;

    console.log(`\nAnalyzing for User ID: ${userId} (${geetpayUser?.email})`);

    // All logs for this user grouped by endpoint
    const [allByEndpoint] = await dbPool.query(
      `SELECT endpoint, COUNT(*) as total_count, MIN(created_at) as earliest, MAX(created_at) as latest 
       FROM api_hit_logs 
       WHERE user_id = ? 
       GROUP BY endpoint`,
      [userId]
    );
    console.log('\n=== ALL TIME HITS BY ENDPOINT ===');
    console.table(allByEndpoint);

    // Let's get all logs for this user with formatted IST time
    const [allLogs] = await dbPool.query(
      `SELECT id, endpoint, status_code, result_code, cost, client_ref_num, 
              created_at,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as raw_created_at,
              DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %H:%i:%s') as ist_created_at
       FROM api_hit_logs
       WHERE user_id = ?
       ORDER BY created_at ASC`,
      [userId]
    );

    console.log(`\nTotal logs count for User ${userId}: ${allLogs.length}`);

    // Let's check how timestamps are stored (are they UTC or IST?)
    // Let's print a sample of logs
    console.log('\nSample logs (first 5 and last 5):');
    console.table(allLogs.slice(0, 5));
    console.table(allLogs.slice(-5));

    // Let's check the breakdown for September 16, 2026 till 7:40 PM IST (19:40:00 IST)
    // Case A: created_at is UTC -> IST is CONVERT_TZ(created_at, '+00:00', '+05:30')
    // Case B: created_at is already stored as IST or local time
    
    console.log('\n================== CASE A: Assuming created_at is stored in UTC ==================');
    const [caseA] = await dbPool.query(
      `SELECT 
         endpoint,
         COUNT(*) as total_hits_all_day,
         SUM(CASE WHEN TIME(CONVERT_TZ(created_at, '+00:00', '+05:30')) <= '19:40:00' THEN 1 ELSE 0 END) as hits_till_1940_ist,
         SUM(CASE WHEN TIME(CONVERT_TZ(created_at, '+00:00', '+05:30')) > '19:40:00' THEN 1 ELSE 0 END) as hits_after_1940_ist
       FROM api_hit_logs
       WHERE user_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) = '2026-09-16'
       GROUP BY endpoint`,
      [userId]
    );
    console.table(caseA);

    console.log('\n================== CASE B: Assuming created_at is stored as Local/IST ==================');
    const [caseB] = await dbPool.query(
      `SELECT 
         endpoint,
         COUNT(*) as total_hits_all_day,
         SUM(CASE WHEN TIME(created_at) <= '19:40:00' THEN 1 ELSE 0 END) as hits_till_1940,
         SUM(CASE WHEN TIME(created_at) > '19:40:00' THEN 1 ELSE 0 END) as hits_after_1940
       FROM api_hit_logs
       WHERE user_id = ? AND DATE(created_at) = '2026-09-16'
       GROUP BY endpoint`,
      [userId]
    );
    console.table(caseB);

    // Let's also check all dates present in the DB
    const [datesPresent] = await dbPool.query(
      `SELECT 
         DATE(created_at) as raw_date,
         DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) as ist_date,
         COUNT(*) as count
       FROM api_hit_logs
       WHERE user_id = ?
       GROUP BY raw_date, ist_date
       ORDER BY raw_date ASC`,
      [userId]
    );
    console.log('\n=== DATES SUMMARY ===');
    console.table(datesPresent);

    // Let's check distinct client_ips or user_agents or request patterns
    const [metaSummary] = await dbPool.query(
      `SELECT client_ip, environment, COUNT(*) as count
       FROM api_hit_logs
       WHERE user_id = ?
       GROUP BY client_ip, environment`,
      [userId]
    );
    console.log('\n=== IP & ENVIRONMENT BREAKDOWN ===');
    console.table(metaSummary);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

analyze();
