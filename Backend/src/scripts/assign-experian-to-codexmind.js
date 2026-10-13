import { dbPool } from '../core/config/db.config.js';
import CacheService from '../core/cache/cache.service.js';

async function assignExperianToCodexmind() {
  try {
    console.log('🔍 Searching for user "codexmind"...');

    // 1. Find user codexmind
    const [users] = await dbPool.query(
      `SELECT id, name, email, company_name FROM users WHERE email LIKE '%codexmind%' OR name LIKE '%codexmind%' OR company_name LIKE '%codexmind%'`
    );

    if (!users || users.length === 0) {
      console.log('⚠️ No user found matching "codexmind". Listing all users:');
      const [allUsers] = await dbPool.query(`SELECT id, name, email FROM users LIMIT 10`);
      console.table(allUsers);
      process.exit(1);
    }

    const targetUser = users[0];
    console.log(`✅ Found user: ID=${targetUser.id}, Name="${targetUser.name}", Email="${targetUser.email}", Company="${targetUser.company_name}"`);

    // 2. Check or insert Experian in catalog
    const catalogId = 'api_experian_credit_report';
    const endpointPath = '/srv2/credit-report/experian';
    const serviceName = 'Experian Credit Report (Srv2)';
    const category = 'KYC & Verification';
    const price = 25.00;

    const [existingCatalog] = await dbPool.query(
      `SELECT * FROM catalog WHERE id = ? OR endpoint_path = ?`,
      [catalogId, endpointPath]
    );

    if (!existingCatalog || existingCatalog.length === 0) {
      await dbPool.query(
        `INSERT INTO catalog (id, service_name, category, method, endpoint_path, upstream_provider, current_price, status, latency_p95, uptime_24h, description, created_at, updated_at) 
         VALUES (?, ?, ?, 'POST', ?, 'Experian Bureau / Bharat API Gateway', ?, 'Active', 1100, 99.95, 'Real-time Experian comprehensive credit score and detailed credit profile report retrieval with bureau accounts, inquiry details, credit score, and white-labeled PDF report link.', NOW(), NOW())`,
        [catalogId, serviceName, category, endpointPath, price]
      );
      console.log(`➕ Created Catalog entry for "${serviceName}" (${endpointPath})`);
    } else {
      console.log(`ℹ️ Catalog entry already exists: ID="${existingCatalog[0].id}", Name="${existingCatalog[0].service_name}"`);
    }

    const effectiveCatalogId = existingCatalog && existingCatalog.length > 0 ? existingCatalog[0].id : catalogId;

    // 3. Assign in user_api_pricing
    const [existingPricing] = await dbPool.query(
      `SELECT id, is_assigned, custom_price FROM user_api_pricing WHERE user_id = ? AND catalog_id = ?`,
      [targetUser.id, effectiveCatalogId]
    );

    if (existingPricing && existingPricing.length > 0) {
      await dbPool.query(
        `UPDATE user_api_pricing SET is_assigned = 1, custom_price = ?, updated_at = NOW() WHERE user_id = ? AND catalog_id = ?`,
        [price, targetUser.id, effectiveCatalogId]
      );
      console.log(`🔄 Updated assignment for catalog_id "${effectiveCatalogId}" -> is_assigned = 1, custom_price = ₹${price}`);
    } else {
      await dbPool.query(
        `INSERT INTO user_api_pricing (user_id, catalog_id, custom_price, is_assigned, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [targetUser.id, effectiveCatalogId, price]
      );
      console.log(`➕ Inserted new assignment for catalog_id "${effectiveCatalogId}" -> is_assigned = 1, custom_price = ₹${price}`);
    }

    // 4. Invalidate Redis Caches
    const endpointsToClear = [
      '/srv2/credit-report/experian',
      '/api/v1/srv2/credit-report/experian',
      '/api/v1/credit-report/experian',
      '/credit-report/experian',
      'experian_credit_report',
      'api_experian_credit_report',
    ];

    for (const ep of endpointsToClear) {
      try {
        await CacheService.del(`access:user:${targetUser.id}:${ep}`);
        await CacheService.del(`pricing:user:${targetUser.id}:${ep}`);
      } catch (e) {}
    }
    console.log(`🧹 Cache cleared for user ID ${targetUser.id}`);

    console.log(`\n🎉 SUCCESS: Experian Credit Report (Srv2) successfully assigned to "${targetUser.name}" (${targetUser.email})!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error assigning API:', err);
    process.exit(1);
  }
}

assignExperianToCodexmind();
