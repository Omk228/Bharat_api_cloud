import { dbPool } from '../core/config/db.config.js';

async function main() {
  const sql = `
    INSERT INTO upstream_credentials (
      id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
    ) VALUES (
      'statement_analyzer_master',
      'IDSPay Statement Analyzer PDF (Srv2)',
      'Banking, Analytics & OCR',
      'https://javabackend.idspay.in/api/v1/prod',
      'APID2994',
      '49034a5a-cee5-4562-947b-03cf06608d94',
      '70Iy81LSYYp0VY1JnAyPNlioXKle2k5J',
      '{}',
      1,
      'production',
      'admin'
    )
    ON DUPLICATE KEY UPDATE
      api_id = 'APID2994',
      api_key = '49034a5a-cee5-4562-947b-03cf06608d94',
      token_id = '70Iy81LSYYp0VY1JnAyPNlioXKle2k5J',
      base_url = 'https://javabackend.idspay.in/api/v1/prod',
      is_active = 1,
      updated_at = NOW();
  `;

  await dbPool.query(sql);
  console.log('✅ statement_analyzer_master credentials successfully upserted into MySQL.');

  const [rows] = await dbPool.query("SELECT * FROM upstream_credentials WHERE id = 'statement_analyzer_master'");
  console.log('Verified Credential Record:', JSON.stringify(rows[0], null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to upsert credentials:', err);
  process.exit(1);
});
