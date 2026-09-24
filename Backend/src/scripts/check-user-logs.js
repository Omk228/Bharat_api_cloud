import { dbPool } from '../core/config/db.config.js';
import { PricingService } from '../modules/pricing/pricing.service.js';

async function main() {
  const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
  console.log('User:', user[0]);
  const userId = user[0].id;

  const pTU = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId);
  const pCrif = await PricingService.getEffectivePrice('/crif/Credit-ScoreV4', userId);
  const pStmt = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId);
  console.log('Effective Pricing for user (including GST):', { pTU, pCrif, pStmt });

  const [pricingRows] = await dbPool.query('SELECT * FROM user_api_pricing WHERE user_id = ?', [userId]);
  console.log('User custom pricing rows:', pricingRows);

  const [catalog] = await dbPool.query('SELECT id, name, endpoint_path, base_price, default_gst_percent FROM api_catalog WHERE id IN (?, ?, ?)', ['api_transunion_cibil_v5', 'api_crif_credit_score_v4', 'api_bank_statement']);
  console.log('Catalog rows:', catalog);

  const [recentLogs] = await dbPool.query("SELECT id, endpoint, cost, is_success, created_at, DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %h:%i:%s %p') as ist FROM api_hit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 15", [userId]);
  console.log('Recent api_hit_logs for user:');
  console.table(recentLogs);

  const [recentTx] = await dbPool.query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10', [userId]);
  console.log('Recent wallet_transactions for user:');
  console.table(recentTx);

  const [allCreds] = await dbPool.query('SELECT * FROM api_credentials WHERE user_id = ?', [userId]);
  console.log('Credentials:', allCreds);

  await dbPool.end();
}

main().catch(console.error);
