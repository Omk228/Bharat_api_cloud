import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function compareUsers() {
  try {
    const [rows] = await dbPool.query(`
      SELECT 
        endpoint,
        SUM(CASE WHEN user_id = 3 THEN 1 ELSE 0 END) as geetpay_panel_hits,
        SUM(CASE WHEN user_id = 3 AND latency_ms > 1000 THEN 1 ELSE 0 END) as geetpay_upstream_live,
        SUM(CASE WHEN user_id = 3 AND latency_ms <= 100 THEN 1 ELSE 0 END) as geetpay_cache_hits,
        SUM(CASE WHEN user_id = 12 THEN 1 ELSE 0 END) as fundlelo_panel_hits,
        SUM(CASE WHEN user_id = 12 AND latency_ms > 1000 THEN 1 ELSE 0 END) as fundlelo_upstream_live,
        SUM(CASE WHEN user_id = 12 AND latency_ms <= 100 THEN 1 ELSE 0 END) as fundlelo_cache_hits,
        COUNT(*) as total_platform_hits,
        SUM(CASE WHEN latency_ms > 1000 THEN 1 ELSE 0 END) as total_live_upstream_calls
      FROM api_hit_logs
      WHERE created_at >= '2026-09-15 18:30:00' AND created_at <= '2026-09-16 14:10:00'
      GROUP BY endpoint
      ORDER BY total_platform_hits DESC
    `);

    console.log('\n========================================================================================');
    console.log('📊 MULTI-TENANT BREAKDOWN: GEETPAY vs FUND LELO vs UPSTREAM LIVE CALLS (TILL 7:40 PM IST)');
    console.log('========================================================================================');
    console.table(rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

compareUsers();
