import { dbPool } from '../core/config/db.config.js';

async function cleanPaymentHistory() {
  try {
    const [debits] = await dbPool.query(
      `SELECT * FROM payment_history WHERE type = 'debit' OR category != 'topup'`
    );
    console.log(`Found ${debits.length} non-recharge records in payment_history.`);

    if (debits.length > 0) {
      await dbPool.query(`DELETE FROM payment_history WHERE type = 'debit' OR category != 'topup'`);
      console.log('✅ Removed non-recharge records from payment_history.');
    }

    const [rows] = await dbPool.query(
      `SELECT id, user_id, type, amount, balance_after, status, utr_number, description, created_at FROM payment_history ORDER BY id DESC`
    );
    console.log('\nFinal payment_history rows (Recharges only):');
    console.table(rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

cleanPaymentHistory();
