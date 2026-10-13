import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { dbPool } from '../core/config/db.config.js';
import CacheService from '../core/cache/cache.service.js';

async function assignMobileIntelligenceToCodexmind() {
  try {
    const targetEmail = 'codexmind@softecindia.com';
    console.log(`🔍 Searching for user with email "${targetEmail}"...`);

    // 1. Find user by email or name
    const [users] = await dbPool.query(
      `SELECT id, name, email, company_name FROM users WHERE email = ? OR email LIKE '%codexmind%' OR name LIKE '%codexmind%'`,
      [targetEmail]
    );

    if (!users || users.length === 0) {
      console.log('⚠️ No user found matching "codexmind". Listing recent users:');
      const [allUsers] = await dbPool.query(`SELECT id, name, email FROM users ORDER BY id DESC LIMIT 10`);
      console.table(allUsers);
      process.exit(1);
    }

    const targetUser = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase()) || users[0];
    console.log(`✅ Found user: ID=${targetUser.id}, Name="${targetUser.name}", Email="${targetUser.email}", Company="${targetUser.company_name}"`);

    // 2. Check or insert Mobile Intelligence in catalog
    const catalogId = 'api_mobile_intelligence';
    const endpointPath = '/api/v1/verify/mobile-intelligence';
    const serviceName = 'Mobile Intelligence';
    const category = 'KYC & Verification';
    const price = 2.00;

    const [existingCatalog] = await dbPool.query(
      `SELECT * FROM catalog WHERE id = ? OR endpoint_path = ?`,
      [catalogId, endpointPath]
    );

    if (!existingCatalog || existingCatalog.length === 0) {
      await dbPool.query(
        `INSERT INTO catalog (id, service_name, category, method, endpoint_path, upstream_provider, current_price, status, latency_p95, uptime_24h, description, created_at, updated_at) 
         VALUES (?, ?, ?, 'POST', ?, 'Bharat Telecom Gateway', ?, 'Active', 150, 99.95, 'Real-time reverse caller intelligence and phone search providing caller identity, telecom circle, operator, alternate numbers, address records, and multi-field confidence matching scores.', NOW(), NOW())`,
        [catalogId, serviceName, category, endpointPath, price]
      );
      console.log(`➕ Created Catalog entry for "${serviceName}" (${endpointPath})`);
    } else {
      await dbPool.query(
        `UPDATE catalog SET upstream_provider = 'Bharat Telecom Gateway', service_name = 'Mobile Intelligence' WHERE id = ? OR endpoint_path = ?`,
        [catalogId, endpointPath]
      );
      console.log(`ℹ️ Catalog entry updated: ID="${existingCatalog[0].id}", Name="${existingCatalog[0].service_name}"`);
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
      '/api/v1/verify/mobile-intelligence',
      '/verify/mobile-intelligence',
      '/srv2/mobile-intelligence',
      '/api/v1/mobile-intelligence',
      'mobile_intelligence',
      'mobile-intelligence',
      'api_mobile_intelligence',
    ];

    for (const ep of endpointsToClear) {
      try {
        await CacheService.del(`access:user:${targetUser.id}:${ep}`);
        await CacheService.del(`pricing:user:${targetUser.id}:${ep}`);
      } catch (e) {}
    }
    console.log(`🧹 Cache cleared for user ID ${targetUser.id}`);

    console.log(`\n🎉 SUCCESS: Mobile Intelligence successfully assigned to "${targetUser.name}" (${targetUser.email})!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error assigning API:', err);
    process.exit(1);
  }
}

assignMobileIntelligenceToCodexmind();
