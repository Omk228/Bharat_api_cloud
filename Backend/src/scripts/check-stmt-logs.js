import { dbPool } from '../core/config/db.config.js';

async function main() {
  const [rows] = await dbPool.query("SELECT * FROM api_hit_logs WHERE endpoint LIKE '%statement%' ORDER BY id DESC LIMIT 10");
  console.log('Latest Statement Logs:', JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
