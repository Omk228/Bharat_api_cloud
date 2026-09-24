import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function check() {
  const [logs] = await dbPool.query(
    "SELECT id, endpoint, cost, created_at, DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %h:%i:%s %p') as ist FROM api_hit_logs WHERE user_id = 3 AND created_at >= '2026-09-24 00:00:00' ORDER BY id DESC"
  );
  console.log('Today logs count:', logs.length);
  console.table(logs);
  await dbPool.end();
}

check().catch(console.error);
