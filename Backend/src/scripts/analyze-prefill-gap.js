import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function checkPrefillDetails() {
  try {
    const [user] = await dbPool.query('SELECT id FROM users WHERE email = ?', ['loan@geetpay.in']);
    const userId = user[0].id;

    const [stats] = await dbPool.query(`
      SELECT 
        CASE 
          WHEN latency_ms = 0 THEN '0ms (Redis Smart Cache Hit - Upstream Bypassed)'
          WHEN latency_ms > 0 AND latency_ms < 1000 THEN '1-999ms (Fast Local/Cached)'
          ELSE '> 1000ms (Live Upstream IDSPay Network Call)'
        END as latency_type,
        COUNT(*) as hit_count,
        ROUND(AVG(latency_ms), 0) as avg_latency_ms
      FROM api_hit_logs
      WHERE user_id = ? 
        AND endpoint = '/srv4/credit-report/prefill'
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
      GROUP BY latency_type
    `, [userId]);

    console.log('\n========================================================================');
    console.log('🎯 MOBILE PREFILL HIT ANALYSIS (16 SEPT TILL 7:40 PM IST)');
    console.log('========================================================================');
    console.table(stats);

    // Let's also check sample bursts
    const [bursts] = await dbPool.query(`
      SELECT id, client_ref_num, latency_ms, 
             DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%H:%i:%s') as time_ist
      FROM api_hit_logs
      WHERE user_id = ? 
        AND endpoint = '/srv4/credit-report/prefill'
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
      ORDER BY id ASC
      LIMIT 20
    `, [userId]);
    console.log('\nSample Sequential Prefill Logs:');
    console.table(bursts);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

checkPrefillDetails();
