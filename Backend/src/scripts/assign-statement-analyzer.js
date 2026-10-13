import { dbPool } from '../core/config/db.config.js';
import CacheService from '../core/cache/cache.service.js';

async function assignStatementAnalyzer() {
  try {
    console.log('🔍 Searching for user "codexmind"...');

    // 1. Find the user
    const [users] = await dbPool.query(
      `SELECT * FROM users WHERE email LIKE '%codexmind%' OR name LIKE '%codexmind%' OR company_name LIKE '%codexmind%'`
    );

    if (!users || users.length === 0) {
      console.log('⚠️ No user found matching "codexmind". Listing all active users:');
      const [allUsers] = await dbPool.query(`SELECT id, name, email, company_name FROM users LIMIT 10`);
      console.table(allUsers);
      process.exit(1);
    }

    const targetUser = users[0];
    console.log(`✅ Found user: ID=${targetUser.id}, Name="${targetUser.name}", Email="${targetUser.email}", Company="${targetUser.company_name}"`);

    // 2. Find the catalog item for Statement Analyzer
    const [catalogs] = await dbPool.query(
      `SELECT id, service_name, category, endpoint_path, current_price, status FROM catalog WHERE id = 'api_bank_statement' OR endpoint_path LIKE '%statement%'`
    );

    console.log('📦 Found Catalog items:');
    console.table(catalogs);

    const catalogIds = catalogs.map((c) => c.id);

    if (catalogIds.length === 0) {
      console.log('⚠️ No catalog item found for statement analyzer.');
      process.exit(1);
    }

    // 3. Assign each catalog item to the user in user_api_pricing
    for (const catalogItem of catalogs) {
      const catalogId = catalogItem.id;
      const basePrice = catalogItem.current_price || 25.0;

      const [existing] = await dbPool.query(
        `SELECT id, is_assigned, custom_price FROM user_api_pricing WHERE user_id = ? AND catalog_id = ?`,
        [targetUser.id, catalogId]
      );

      if (existing && existing.length > 0) {
        await dbPool.query(
          `UPDATE user_api_pricing SET is_assigned = 1, updated_at = NOW() WHERE user_id = ? AND catalog_id = ?`,
          [targetUser.id, catalogId]
        );
        console.log(`🔄 Updated assignment for catalog_id "${catalogId}" -> is_assigned = 1`);
      } else {
        await dbPool.query(
          `INSERT INTO user_api_pricing (user_id, catalog_id, custom_price, is_assigned, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [targetUser.id, catalogId, basePrice]
        );
        console.log(`➕ Inserted new assignment for catalog_id "${catalogId}" with custom_price = ₹${basePrice} -> is_assigned = 1`);
      }
    }

    // 4. Invalidate Cache
    const endpointsToClear = [
      '/api/v1/statement-analyzer',
      '/statement-analyzer',
      '/srv2/statement-upload',
      '/srv2/statement-analyzer',
      '/statement-upload',
      'statement_analyzer',
      'api_bank_statement',
    ];

    for (const ep of endpointsToClear) {
      await CacheService.del(`access:user:${targetUser.id}:${ep}`);
      await CacheService.del(`pricing:user:${targetUser.id}:${ep}`);
    }
    console.log(`🧹 Cache cleared for user ID ${targetUser.id}`);

    console.log(`\n🎉 SUCCESS: Statement Analyzer API successfully assigned to "${targetUser.name}" (${targetUser.email})!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error assigning API:', err);
    process.exit(1);
  }
}

assignStatementAnalyzer();
