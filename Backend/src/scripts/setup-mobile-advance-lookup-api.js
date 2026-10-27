import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { dbPool } from '../core/config/db.config.js';

async function setupMobileAdvanceLookupApi() {
  try {
    console.log('--- Setting up Mobile Advance Lookup in Database ---');

    const catalogId = 'api_mobile_advance_lookup';
    const serviceName = 'Mobile Advance Lookup';
    const category = 'KYC & Verification';
    const method = 'POST';
    const endpointPath = '/api/v1/verify/mobile-advance-lookup';
    const currentPrice = '15.00';
    const upstreamProvider = 'Bharat Composite Telecom Gateway';
    const description = 'Unified Mobile Intelligence & KYC Prefill suite combining real-time telecom caller intelligence, operator, circle, and spam signals with verified identity records, PAN, and registered addresses.';

    // 1. Insert/Update catalog entry
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status, upstream_provider, description, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'Active', ?, ?, NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        service_name = VALUES(service_name),
        category = VALUES(category),
        method = VALUES(method),
        endpoint_path = VALUES(endpoint_path),
        current_price = VALUES(current_price),
        status = 'Active',
        upstream_provider = VALUES(upstream_provider),
        description = VALUES(description),
        updated_at = NOW();
    `, [catalogId, serviceName, category, method, endpointPath, currentPrice, upstreamProvider, description]);

    console.log(`✅ Catalog entry registered/updated for "${catalogId}" with base price ₹${currentPrice}`);

    // 2. Assign API to all users in user_api_pricing
    const [users] = await dbPool.query('SELECT id, email FROM users');
    let assignedCount = 0;

    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (
          user_id, catalog_id, custom_price, is_assigned, updated_at
        ) VALUES (
          ?, ?, NULL, 1, NOW()
        )
        ON DUPLICATE KEY UPDATE
          is_assigned = 1,
          updated_at = NOW();
      `, [u.id, catalogId]);
      assignedCount++;
    }

    console.log(`✅ Assigned "${catalogId}" to ${assignedCount} user(s) in user_api_pricing.`);
    console.log('🎉 Setup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up Mobile Advance Lookup API:', err);
    process.exit(1);
  }
}

setupMobileAdvanceLookupApi();
