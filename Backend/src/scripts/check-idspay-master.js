import { dbPool } from '../core/config/db.config.js';
import { credentialResolver } from '../core/credentials/credentialResolver.js';

async function main() {
  const [rows] = await dbPool.query("SELECT * FROM upstream_credentials WHERE id = 'idspay_master'");
  console.log('MySQL idspay_master row:', JSON.stringify(rows[0], null, 2));

  const creds = await credentialResolver.getStatementAnalyzerCredentials();
  console.log('Resolved by credentialResolver:', JSON.stringify(creds, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
