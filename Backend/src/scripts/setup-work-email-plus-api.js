import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function setupWorkEmailPlusApi() {
  try {
    console.log('--- Setting up Work Email Verifier Plus in Database ---');

    // 1. Insert/Update upstream_credentials
    const apiKey = process.env.WORK_EMAIL_PLUS_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082';
    const baseUrl = process.env.WORK_EMAIL_PLUS_BASE_URL || 'https://app.way2api.com/api/v1/email/validate';

    await dbPool.query(`
      INSERT INTO upstream_credentials (
        id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
      ) VALUES (
        'way2api_email_master',
        'Work Email Verifier Plus Gateway',
        'Email & Employment Verification',
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
    console.log('✅ upstream_credentials updated for way2api_email_master');

    // 2. Insert/Update catalog
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status, upstream_provider, description
      ) VALUES (
        'api_work_email_plus',
        'Work Email Verifier Plus',
        'KYC & Verification',
        'POST',
        '/api/v1/verify/work-email-plus',
        '2.00',
        'Active',
        'WAY2API Gateway',
        'Verify email deliverability, RFC syntax validity, corporate vs free domain classification, disposable and spam status, catch-all policy, role accounts, and full MX record inspection in real-time.'
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
    console.log('✅ catalog updated for api_work_email_plus');

    // 3. Assign API to all users in user_api_pricing
    const [users] = await dbPool.query('SELECT id FROM users');
    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (
          user_id, catalog_id, custom_price, is_assigned, updated_at
        ) VALUES (
          ?, 'api_work_email_plus', NULL, 1, NOW()
        )
        ON DUPLICATE KEY UPDATE
          is_assigned = 1,
          updated_at = NOW();
      `, [u.id]);
    }
    console.log(`✅ user_api_pricing assigned for ${users.length} users`);

    console.log('--- Work Email Verifier Plus DB Setup Completed Successfully ---');
    await dbPool.end();
  } catch (err) {
    console.error('❌ Error setting up Work Email Verifier Plus API in DB:', err);
    process.exit(1);
  }
}

setupWorkEmailPlusApi();
