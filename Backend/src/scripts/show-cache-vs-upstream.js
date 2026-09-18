import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function showDbQuery() {
  try {
    const sql = `
      SELECT 
        id,
        endpoint,
        client_ref_num,
        latency_ms,
        CASE 
          WHEN latency_ms = 0 THEN '🔥 CACHE (Redis - Instant 0ms)'
          WHEN latency_ms > 0 AND latency_ms <= 100 THEN '⚡ CACHE / FAST (Local)'
          ELSE '🌐 UPSTREAM (Live IDSPay Network Call)'
        END AS request_source,
        cost,
        DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%d-%m-%Y %h:%i:%s %p') as time_ist
      FROM api_hit_logs
      WHERE user_id = 3 
        AND endpoint = '/srv4/credit-report/prefill'
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
      ORDER BY id ASC
      LIMIT 25;
    `;

    const [rows] = await dbPool.query(sql);
    console.log('=== SAMPLE LOGS SHOWING CACHE VS UPSTREAM ===');
    console.table(rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

showDbQuery();
