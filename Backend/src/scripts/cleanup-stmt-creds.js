import { dbPool } from '../core/config/db.config.js';

async function main() {
  await dbPool.query("DELETE FROM upstream_credentials WHERE id = 'statement_analyzer_master'");
  console.log('✅ Cleaned up statement_analyzer_master from DB. Relying on idspay_master.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
