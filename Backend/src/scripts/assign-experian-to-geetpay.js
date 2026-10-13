import { dbPool } from '../core/config/db.config.js';
import CacheService from '../core/cache/cache.service.js';

async function assignExperianToGeetpay() {
  try {
    console.log('🔍 Searching for user "loan@geetpay.in"...');

    // 1. Find user geetpay
    const [users] = await dbPool.query(
      `SELECT id, name, email, company_name, wallet_balance FROM users WHERE email = 'loan@geetpay.in' OR email LIKE '%geetpay%'`
    );


    if (!users || users.length === 0) {
      console.log('⚠️ No user found matching "loan@geetpay.in". Listing users:');
      const [allUsers] = await dbPool.query(`SELECT id, name, email FROM users`);
      console.table(allUsers);
      process.exit(1);
    }

    console.table(users);
    const targetUser = users.find(u => u.email.toLowerCase() === 'loan@geetpay.in') || users[0];
    console.log(`✅ Target user selected: ID=${targetUser.id}, Name="${targetUser.name}", Email="${targetUser.email}", Company="${targetUser.company_name}"`);

    // Check target user's existing bureau pricing
    const [existingBureauPricing] = await dbPool.query(
      `SELECT p.*, c.service_name, c.endpoint_path 
       FROM user_api_pricing p 
       JOIN catalog c ON p.catalog_id = c.id 
       WHERE p.user_id = ? AND (c.endpoint_path LIKE '%credit%' OR c.endpoint_path LIKE '%transunion%' OR c.endpoint_path LIKE '%experian%' OR c.endpoint_path LIKE '%crif%')`,
      [targetUser.id]
    );
    console.log('📊 Existing Bureau Pricing for Geetpay:');
    console.table(existingBureauPricing);

    // 2. Check or verify Experian in catalog
    const catalogId = 'api_experian_credit_report';
    const endpointPath = '/srv2/credit-report/experian';
    const serviceName = 'Experian Credit Report (Srv2)';
    const category = 'KYC & Verification';
    const defaultPrice = 25.00;

    const [existingCatalog] = await dbPool.query(
      `SELECT * FROM catalog WHERE id = ? OR endpoint_path = ?`,
      [catalogId, endpointPath]
    );

    let effectiveCatalogId = catalogId;
    if (!existingCatalog || existingCatalog.length === 0) {
      await dbPool.query(
        `INSERT INTO catalog (id, service_name, category, method, endpoint_path, upstream_provider, current_price, status, latency_p95, uptime_24h, description, created_at, updated_at) 
         VALUES (?, ?, ?, 'POST', ?, 'Experian Bureau / Bharat API Gateway', ?, 'Active', 1100, 99.95, 'Real-time Experian comprehensive credit score and detailed credit profile report retrieval with bureau accounts, inquiry details, credit score, and white-labeled PDF report link.', NOW(), NOW())`,
        [catalogId, serviceName, category, endpointPath, defaultPrice]
      );
      console.log(`➕ Created Catalog entry for "${serviceName}" (${endpointPath})`);
    } else {
      effectiveCatalogId = existingCatalog[0].id;
      console.log(`ℹ️ Catalog entry found: ID="${effectiveCatalogId}", Name="${existingCatalog[0].service_name}"`);
    }

    // 3. Assign in user_api_pricing
    const [existingPricing] = await dbPool.query(
      `SELECT id, is_assigned, custom_price FROM user_api_pricing WHERE user_id = ? AND catalog_id = ?`,
      [targetUser.id, effectiveCatalogId]
    );

    if (existingPricing && existingPricing.length > 0) {
      await dbPool.query(
        `UPDATE user_api_pricing SET is_assigned = 1, custom_price = ?, updated_at = NOW() WHERE user_id = ? AND catalog_id = ?`,
        [defaultPrice, targetUser.id, effectiveCatalogId]
      );
      console.log(`🔄 Updated assignment for catalog_id "${effectiveCatalogId}" -> is_assigned = 1, custom_price = ₹${defaultPrice}`);
    } else {
      await dbPool.query(
        `INSERT INTO user_api_pricing (user_id, catalog_id, custom_price, is_assigned, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [targetUser.id, effectiveCatalogId, defaultPrice]
      );
      console.log(`➕ Inserted new assignment for catalog_id "${effectiveCatalogId}" -> is_assigned = 1, custom_price = ₹${defaultPrice}`);
    }

    // 4. Invalidate Redis Caches for Target User
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

    // Verify all assigned APIs for Geetpay
    const [allAssigned] = await dbPool.query(
      `SELECT p.id as pricing_id, p.catalog_id, c.service_name, c.endpoint_path, p.custom_price, p.is_assigned 
       FROM user_api_pricing p 
       JOIN catalog c ON p.catalog_id = c.id 
       WHERE p.user_id = ? AND p.is_assigned = 1`,
      [targetUser.id]
    );
    console.log(`\n📋 All Currently Assigned APIs for "${targetUser.name}" (${targetUser.email}):`);
    console.table(allAssigned);

    console.log(`\n🎉 SUCCESS: Experian Credit Report (Srv2) successfully assigned to "${targetUser.name}" (${targetUser.email})!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error assigning API:', err);
    process.exit(1);
  }
}

assignExperianToGeetpay();
