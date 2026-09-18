import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function updateCatalogBranding() {
  try {
    const [result] = await dbPool.query(`
      UPDATE catalog 
      SET description = REPLACE(description, 'powered by IDSpay', 'powered by Bharat API Gateway'),
          upstream_provider = CASE 
            WHEN upstream_provider = 'IDSpay Gateway' THEN 'NPCI & Banking Rails'
            WHEN upstream_provider = 'IDSPAY' THEN 'CRIF High Mark / Bharat API'
            ELSE upstream_provider 
          END
      WHERE description LIKE '%idspay%' OR upstream_provider LIKE '%idspay%'
    `);
    console.log('Affected rows:', result.affectedRows);

    const [rows] = await dbPool.query(
      "SELECT id, service_name, upstream_provider, description FROM catalog WHERE id IN ('api_mobile_to_bank_advance', 'api_crif_credit_score_v4')"
    );
    console.log('Updated catalog items:', rows);
    await dbPool.end();
  } catch (err) {
    console.error('Error updating catalog:', err);
    process.exit(1);
  }
}

updateCatalogBranding();
