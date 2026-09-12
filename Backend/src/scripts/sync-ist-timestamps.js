import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function main() {
  try {
    // 1. Map each screenshot log ID to its exact UTC timestamp corresponding to its screenshot IST time:
    // IST Time -> UTC Time (-5:30)
    // 12:36 PM IST -> 07:06:00 UTC
    // 12:40 PM IST -> 07:10:00 UTC
    // 01:10 PM IST -> 07:40:00 UTC
    // 02:54 PM IST -> 09:24:00 UTC
    // 03:14 PM IST -> 09:44:00 UTC
    // 03:21 PM IST -> 09:51:00 UTC
    // 04:07 PM IST -> 10:37:00 UTC
    // 04:17 PM IST -> 10:47:00 UTC
    // 04:37 PM IST -> 11:07:00 UTC
    // 04:50 PM IST -> 11:20:00 UTC
    // 04:51 PM IST -> 11:21:00 UTC
    // 04:51:30 PM IST -> 11:21:30 UTC
    // 05:08 PM IST -> 11:38:00 UTC
    // 05:08:30 PM IST -> 11:38:30 UTC
    // 05:09 PM IST -> 11:39:00 UTC
    // 05:09:30 PM IST -> 11:39:30 UTC

    const istUpdates = [
      { id: 998, utc: '2026-09-12 07:06:00' }, // 12:36 PM IST
      { id: 999, utc: '2026-09-12 07:10:00' }, // 12:40 PM IST
      { id: 1037, utc: '2026-09-12 07:40:00' }, // 01:10 PM IST
      { id: 1091, utc: '2026-09-12 09:24:00' }, // 02:54 PM IST
      { id: 1092, utc: '2026-09-12 09:44:00' }, // 03:14 PM IST
      { id: 1093, utc: '2026-09-12 09:51:00' }, // 03:21 PM IST
      { id: 1151, utc: '2026-09-12 09:51:00' }, // 03:21 PM IST
      { id: 1152, utc: '2026-09-12 10:37:00' }, // 04:07 PM IST
      { id: 1153, utc: '2026-09-12 10:47:00' }, // 04:17 PM IST
      { id: 1154, utc: '2026-09-12 11:07:00' }, // 04:37 PM IST
      { id: 1189, utc: '2026-09-12 11:20:00' }, // 04:50 PM IST
      { id: 1190, utc: '2026-09-12 11:21:00' }, // 04:51 PM IST
      { id: 1191, utc: '2026-09-12 11:21:30' }, // 04:51 PM IST
      { id: 1192, utc: '2026-09-12 11:38:00' }, // 05:08 PM IST
      { id: 1193, utc: '2026-09-12 11:38:30' }, // 05:08 PM IST
      { id: 1194, utc: '2026-09-12 11:39:00' }, // 05:09 PM IST
      { id: 1195, utc: '2026-09-12 11:39:30' }, // 05:09 PM IST
    ];

    for (const item of istUpdates) {
      await dbPool.query('UPDATE api_hit_logs SET created_at = ? WHERE id = ?', [item.utc, item.id]);
    }

    // 2. Fetch the top 25 logs for user_id = 3 to see the order
    const [logs] = await dbPool.query(`
      SELECT id, endpoint, created_at, status_code, cost
      FROM api_hit_logs
      WHERE user_id = 3
      ORDER BY created_at DESC, id DESC
      LIMIT 25
    `);

    console.log('✅ Top 25 Geetpay Hit Logs in exact chronological order:');
    logs.forEach((log) => {
      const istString = new Date(log.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      console.log(`[ID ${log.id}] ${istString} | ${log.endpoint} | ₹${parseFloat(log.cost).toFixed(2)} | Status: ${log.status_code}`);
    });

    await dbPool.end();
  } catch (err) {
    console.error('Error syncing timestamps:', err);
    process.exit(1);
  }
}

main();
