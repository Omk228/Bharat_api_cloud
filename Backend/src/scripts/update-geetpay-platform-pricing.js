import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import { PricingService } from '../modules/pricing/pricing.service.js';

async function main() {
  try {
    const [user] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE email = ?', ['loan@geetpay.in']);
    if (!user || user.length === 0) {
      console.error('User not found: loan@geetpay.in');
      process.exit(1);
    }
    const userId = user[0].id;
    console.log(`User ID: ${userId}, Email: ${user[0].email}, Current Wallet Balance: ₹${user[0].wallet_balance}`);

    // Get Platform Prices
    const priceStatement = await PricingService.getEffectivePrice('/srv2/statement-analyzer', userId);
    const priceTransunion = await PricingService.getEffectivePrice('/srv5/transunion-Score-Hybrid', userId);

    console.log(`Platform Pricing for Statement Analyzer: ₹${priceStatement.toFixed(2)} (Base ₹25.00 + 18% GST)`);
    console.log(`Platform Pricing for Transunion V5: ₹${priceTransunion.toFixed(2)} (Base ₹75.00 + 18% GST)`);

    // Fetch the 2 logs we inserted (IDs 5780 and 5781)
    const [logs] = await dbPool.query(
      'SELECT id, endpoint, cost, created_at FROM api_hit_logs WHERE id IN (5780, 5781) AND user_id = ?',
      [userId]
    );
    console.log('\nCurrent Log records:', logs);

    // Update log costs to platform pricing
    await dbPool.query('UPDATE api_hit_logs SET cost = ? WHERE id = 5780 AND user_id = ?', [priceStatement, userId]);
    await dbPool.query('UPDATE api_hit_logs SET cost = ? WHERE id = 5781 AND user_id = ?', [priceTransunion, userId]);

    // Calculate total platform cost and adjust user wallet balance
    // Previous deduction was 17.70 + 59.00 = 76.70
    // Correct total deduction should be 29.50 + 88.50 = 118.00
    // Additional deduction needed = 118.00 - 76.70 = 41.30
    const additionalDeduction = (priceStatement + priceTransunion) - (17.70 + 59.00);
    console.log(`Additional wallet deduction needed: ₹${additionalDeduction.toFixed(2)}`);

    await dbPool.query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
      [additionalDeduction, userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);

    const [updatedLogs] = await dbPool.query(
      `SELECT id, endpoint, cost,
              DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+05:30'), '%Y-%m-%d %h:%i %p') as ist_created_at
       FROM api_hit_logs 
       WHERE id IN (5780, 5781) AND user_id = ?`,
      [userId]
    );

    console.log('\n================ PLATFORM PRICING ADJUSTMENT COMPLETE ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.table(updatedLogs);
    console.log(`Total Platform Pricing Deduction: -₹${(priceStatement + priceTransunion).toFixed(2)}`);
    console.log(`Final Updated Wallet Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('=======================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error applying platform pricing:', err);
    process.exit(1);
  }
}

main();
