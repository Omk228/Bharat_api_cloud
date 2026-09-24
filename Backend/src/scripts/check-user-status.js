import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function check() {
  try {
    const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', ['loan@geetpay.in']);
    console.log('USER:', users[0]);
    if (!users || users.length === 0) {
      console.log('User not found');
      return;
    }
    const userId = users[0].id;
    const [creds] = await dbPool.query('SELECT * FROM api_credentials WHERE user_id = ?', [userId]);
    console.log('CREDS:', creds);

    const [recentLogs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as utc_created_at,
              DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %h:%i %p') as ist_created_at
       FROM api_hit_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );
    console.log('RECENT LOGS (Last 10):');
    console.table(recentLogs);

    const [todayLogs] = await dbPool.query(
      `SELECT id, endpoint, cost, created_at,
              DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %h:%i %p') as ist_created_at
       FROM api_hit_logs 
       WHERE user_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) = '2026-09-21'`,
      [userId]
    );
    console.log('TODAY (2026-09-21) LOGS:');
    console.table(todayLogs);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
  }
}

check();
