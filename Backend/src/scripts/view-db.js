import { dbPool } from '../config/db.config.js';

async function viewDatabase() {
  try {
    console.log('\n==================== 📊 BHARAT API CLOUD DATABASE 📊 ====================');
    
    // Fetch users
    const [users] = await dbPool.query(
      'SELECT id, name, company_name, email, plan, role, wallet_balance, onboarded, is_active, created_at FROM users ORDER BY id ASC'
    );

    console.log(`\n👥 Clients / Users Table (${users.length} record${users.length === 1 ? '' : 's'}):`);
    if (users.length > 0) {
      console.table(users);
    } else {
      console.log('⚠️ No records found in users table.');
    }

    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Error reading database:', error.message);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

viewDatabase();
