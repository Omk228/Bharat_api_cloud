import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function setupWorkEmailApi() {
  try {
    console.log('--- Setting up Work Email Verifier API in Database ---');

    // 1. Insert/Update upstream_credentials
    await dbPool.query(`
      INSERT INTO upstream_credentials (
        id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
      ) VALUES (
        'work_email_master',
        'Corp Email Verifier Gateway',
        'Email & Employment Verification',
        'https://corp-email-verifier.onrender.com/api/verify',
        'bharat_api_cloud',
        'bac_live_7f8e3a2b1c0d4e5f',
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
        api_id = VALUES(api_id),
        api_key = VALUES(api_key),
        is_active = 1,
        environment = VALUES(environment),
        updated_at = NOW();
    `);
    console.log('✅ upstream_credentials updated for work_email_master');

    // 2. Insert/Update catalog
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status
      ) VALUES (
        'api_work_email_verifier',
        'Work Email Verifier API',
        'KYC & Verification',
        'POST',
        '/api/v1/verify/work-email',
        '2.00',
        'Active'
      )
      ON DUPLICATE KEY UPDATE
        service_name = VALUES(service_name),
        category = VALUES(category),
        method = VALUES(method),
        endpoint_path = VALUES(endpoint_path),
        current_price = VALUES(current_price),
        status = 'Active';
    `);
    console.log('✅ catalog updated for api_work_email_verifier');

    // 3. Assign API to all users in user_api_pricing
    const [users] = await dbPool.query('SELECT id FROM users');
    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (
          user_id, catalog_id, custom_price, is_assigned, updated_at
        ) VALUES (
          ?, 'api_work_email_verifier', NULL, 1, NOW()
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
    console.error('❌ Error setting up Work Email API:', err);
    process.exit(1);
  }
}

setupWorkEmailApi();
