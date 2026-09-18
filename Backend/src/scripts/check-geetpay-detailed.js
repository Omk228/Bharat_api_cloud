import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function detailedCheck() {
  try {
    const [user] = await dbPool.query('SELECT * FROM users WHERE email = ?', ['loan@geetpay.in']);
    const userId = user[0].id;
    console.log(`User: ${user[0].email} (ID: ${userId}), Balance: ₹${user[0].wallet_balance}`);

    // Exact count till 7:40 PM IST (19:40:00 IST = 2026-09-16 14:10:00 UTC)
    const [till740] = await dbPool.query(`
      SELECT 
        endpoint,
        COUNT(*) as count_till_740pm_ist,
        MIN(CONVERT_TZ(created_at, '+00:00', '+05:30')) as earliest_ist,
        MAX(CONVERT_TZ(created_at, '+00:00', '+05:30')) as latest_ist,
        SUM(cost) as total_cost_deducted
      FROM api_hit_logs
      WHERE user_id = ? 
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
      GROUP BY endpoint
      ORDER BY count_till_740pm_ist DESC
    `, [userId]);

    console.log('\n========================================================================================');
    console.log('📌 EXACT HITS ON OUR PLATFORM ON 16 SEPT 2026 TILL 7:40 PM IST (19:40 IST)');
    console.log('========================================================================================');
    console.table(till740);

    const [specificApisTill740] = await dbPool.query(`
      SELECT 
        CASE 
          WHEN endpoint LIKE '%credit-report/prefill%' THEN 'Mobile Prefill (/srv4/credit-report/prefill)'
          WHEN endpoint LIKE '%uan-mobile%' THEN 'Mobile to UAN v2 (/srv3/uan-mobile)'
          WHEN endpoint LIKE '%transunion%' THEN 'Transunion (/srv5/transunion-Score-Hybrid)'
          WHEN endpoint LIKE '%bank_account%' OR endpoint LIKE '%mobile-to-bank%' THEN 'Bank Validation (/validate_bank_account & /mobile-to-bank)'
          ELSE 'Other'
        END as service_category,
        endpoint,
        COUNT(*) as hit_count,
        SUM(cost) as total_cost
      FROM api_hit_logs
      WHERE user_id = ? 
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
        AND (
          endpoint LIKE '%credit-report/prefill%' OR 
          endpoint LIKE '%uan-mobile%' OR 
          endpoint LIKE '%transunion%' OR 
          endpoint LIKE '%bank_account%' OR 
          endpoint LIKE '%mobile-to-bank%'
        )
      GROUP BY service_category, endpoint
      ORDER BY hit_count DESC
    `, [userId]);

    console.log('\n========================================================================================');
    console.log('🎯 SPECIFIC REQUESTED SERVICES (TILL 7:40 PM IST - 16 SEPT):');
    console.log('========================================================================================');
    console.table(specificApisTill740);

    // Full day count for comparison
    const [fullDay] = await dbPool.query(`
      SELECT 
        endpoint,
        COUNT(*) as total_all_day_16_sept,
        SUM(CASE WHEN created_at <= '2026-09-16 14:10:00' THEN 1 ELSE 0 END) as count_till_740pm_ist,
        SUM(CASE WHEN created_at > '2026-09-16 14:10:00' THEN 1 ELSE 0 END) as count_after_740pm_ist
      FROM api_hit_logs
      WHERE user_id = ? 
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 18:29:59'
      GROUP BY endpoint
      ORDER BY total_all_day_16_sept DESC
    `, [userId]);

    console.log('\n========================================================================================');
    console.log('📅 FULL DAY 16 SEPT COMPARISON (TILL 7:40 PM vs AFTER 7:40 PM):');
    console.log('========================================================================================');
    console.table(fullDay);

    // Total counts summary
    const [totalSummary] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_hits_till_740pm,
        SUM(cost) as total_amount_till_740pm
      FROM api_hit_logs
      WHERE user_id = ? 
        AND created_at >= '2026-09-15 18:30:00' 
        AND created_at <= '2026-09-16 14:10:00'
    `, [userId]);
    console.log('\nTotal hits till 7:40 PM:', totalSummary[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

detailedCheck();
