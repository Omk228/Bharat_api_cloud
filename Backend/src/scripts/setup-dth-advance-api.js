import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function setupDthAdvanceApi() {
  try {
    console.log('--- Setting up DTH Operator Advance in Database ---');

    // 1. Insert/Update upstream_credentials
    const apiKey = process.env.DTH_ADVANCE_API_KEY || process.env.WAY2API_DTH_API_KEY || process.env.OPERATOR_CHECK_API_KEY || process.env.WAY2API_OPERATOR_API_KEY || process.env.WAY2API_BANK_API_KEY || process.env.WAY2API_EMAIL_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082';
    const baseUrl = process.env.DTH_ADVANCE_BASE_URL || process.env.WAY2API_DTH_INFO_BASE_URL || 'https://app.way2api.com/api/v1/dth/info';

    await dbPool.query(`
      INSERT INTO upstream_credentials (
        id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
      ) VALUES (
        'way2api_dth_advance_master',
        'DTH Operator Advance Gateway',
        'Telecom & DTH Verification',
        ?,
        'bharat_api_cloud',
        ?,
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
    `, [baseUrl, apiKey]);
    console.log('✅ upstream_credentials updated for way2api_dth_advance_master');

    // 2. Insert/Update catalog
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status, upstream_provider, description
      ) VALUES (
        'api_dth_operator_advance',
        'DTH operator advance',
        'KYC & Verification',
        'POST',
        '/api/v1/verify/dth-advance',
        '2.50',
        'Active',
        'WAY2API Gateway',
        'Advanced Direct-to-Home (DTH) subscriber verification and account intelligence returning customer name, registered mobile, balance, monthly plan, recharge dates, and billing address across Indian DTH operators.'
      )
      ON DUPLICATE KEY UPDATE
        service_name = VALUES(service_name),
        category = VALUES(category),
        method = VALUES(method),
        endpoint_path = VALUES(endpoint_path),
        current_price = VALUES(current_price),
        status = 'Active',
        upstream_provider = VALUES(upstream_provider),
        description = VALUES(description);
    `);
    console.log('✅ catalog updated for api_dth_operator_advance');

    // 3. Assign API to all users in user_api_pricing
    const [users] = await dbPool.query('SELECT id FROM users');
    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (
          user_id, catalog_id, custom_price, is_assigned, updated_at
        ) VALUES (
          ?, 'api_dth_operator_advance', NULL, 1, NOW()
        )
        ON DUPLICATE KEY UPDATE
          is_assigned = 1,
          updated_at = NOW();
      `, [u.id]);
    }
    console.log(`✅ user_api_pricing assigned for ${users.length} users`);

    console.log('--- DTH Operator Advance DB Setup Completed Successfully ---');
    await dbPool.end();
  } catch (err) {
    console.error('❌ Error setting up DTH Operator Advance API in DB:', err);
    process.exit(1);
  }
}

setupDthAdvanceApi();
