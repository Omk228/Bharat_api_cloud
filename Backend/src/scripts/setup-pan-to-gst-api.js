import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function setupPanToGstApi() {
  try {
    console.log('--- Setting up PAN to GST Verification API in Database ---');

    // 1. Insert/Update upstream_credentials
    await dbPool.query(`
      INSERT INTO upstream_credentials (
        id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
      ) VALUES (
        'pan_to_gst_master',
        'API Saathi Gateway',
        'KYC & Verification',
        'https://apisathi.in/gw/v1/gstin-by-pan-v1/',
        '',
        'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7',
        '',
        '{}',
        1,
        'production',
        'admin'
      )
      ON DUPLICATE KEY UPDATE
        provider_name = VALUES(provider_name),
        category = VALUES(category),
        base_url = VALUES(base_url),
        api_key = VALUES(api_key),
        is_active = 1,
        environment = VALUES(environment),
        updated_at = NOW();
    `);
    console.log('✅ upstream_credentials updated for pan_to_gst_master');

    // 2. Insert/Update catalog
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status, latency_p95, uptime_24h, description
      ) VALUES (
        'api_pan_to_gst',
        'PAN to GST',
        'KYC & Verification',
        'POST',
        '/api/v1/verify/pan-to-gst',
        '3.00',
        'Active',
        280,
        99.9,
        'Fetch all Goods and Services Tax Identification Numbers (GSTIN) registered against a business or individual PAN.'
      )
      ON DUPLICATE KEY UPDATE
        service_name = VALUES(service_name),
        category = VALUES(category),
        method = VALUES(method),
        endpoint_path = VALUES(endpoint_path),
        current_price = VALUES(current_price),
        status = 'Active',
        description = VALUES(description);
    `);
    console.log('✅ catalog updated for api_pan_to_gst');

    // 3. Assign API to all users in user_api_pricing
    const [users] = await dbPool.query('SELECT id FROM users');
    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (
          user_id, catalog_id, custom_price, is_assigned, updated_at
        ) VALUES (
          ?, 'api_pan_to_gst', NULL, 1, NOW()
        )
        ON DUPLICATE KEY UPDATE
          is_assigned = 1,
          updated_at = NOW();
      `, [u.id]);
    }
    console.log(`✅ user_api_pricing assigned for ${users.length} users`);

    console.log('--- Setup Completed Successfully ---');
    await dbPool.end();
  } catch (err) {
    console.error('❌ Error setting up PAN to GST API:', err);
    process.exit(1);
  }
}

setupPanToGstApi();
