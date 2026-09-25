import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function check() {
  const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
  console.log('User:', user[0]);

  const [pricing] = await dbPool.query(
    `SELECT c.id, c.service_name, c.endpoint_path, c.current_price, p.custom_price, p.is_assigned 
     FROM catalog c 
     LEFT JOIN user_api_pricing p ON p.catalog_id = c.id AND p.user_id = 3
     WHERE c.id IN ('api_transunion_cibil_v5', 'api_crif_credit_score_v4', 'api_bank_statement')`
  );
  console.log('User 3 Pricing:', pricing);

  const [hitsSep24] = await dbPool.query(
    `SELECT id, endpoint, method, client_ref_num, status_code, result_code, cost, created_at 
     FROM api_hit_logs 
     WHERE user_id = 3 AND created_at >= '2026-09-24 15:00:00' AND created_at <= '2026-09-24 17:00:00'
     ORDER BY created_at ASC`
  );
  console.log('Sep 24 (9:30 PM - 10:30 PM IST / UTC 16:00) Hits:');
  console.table(hitsSep24);

  const [hitsSep25] = await dbPool.query(
    `SELECT id, endpoint, method, client_ref_num, status_code, result_code, cost, created_at 
     FROM api_hit_logs 
     WHERE user_id = 3 AND created_at >= '2026-09-25 05:00:00'
     ORDER BY created_at ASC`
  );
  console.log('Sep 25 Hits (since 10:30 AM IST / UTC 05:00):');
  console.table(hitsSep25);

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
