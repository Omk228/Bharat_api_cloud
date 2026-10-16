import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';

async function setupGstToContactApi() {
  try {
    console.log('--- Setting up GST to Contact Details Verification API in Database ---');

    // 1. Insert/Update upstream_credentials
    await dbPool.query(`
      INSERT INTO upstream_credentials (
        id, provider_name, category, base_url, api_id, api_key, token_id, extra_headers, is_active, environment, updated_by
      ) VALUES (
        'gst_to_contact_master',
        'API Saathi Gateway',
        'KYC & Verification',
        'https://apisathi.in/gw/v1/gstin-to-contact-v1/',
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
    console.log('✅ upstream_credentials updated for gst_to_contact_master');

    // 2. Insert/Update catalog (Base price: 5.00 INR)
    await dbPool.query(`
      INSERT INTO catalog (
        id, service_name, category, method, endpoint_path, current_price, status, latency_p95, uptime_24h, description
      ) VALUES (
        'api_gst_to_contact',
        'GST to Contact Details',
        'KYC & Verification',
        'POST',
        '/api/v1/verify/gst-to-contact',
        '5.00',
        'Active',
        310,
        99.9,
        'Fetch official business and authorized contact details (mobile numbers, email addresses, authorized signatories, registered address) from a GSTIN.'
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
    console.log('✅ catalog updated for api_gst_to_contact (Base: ₹5.00, +18% GST: ₹5.90)');

    // 3. Assign to all active users in user_api_pricing
    const [users] = await dbPool.query(`SELECT id FROM users`);
    console.log(`Assigning api_gst_to_contact to ${users.length} users...`);

    for (const u of users) {
      await dbPool.query(`
        INSERT INTO user_api_pricing (user_id, catalog_id, custom_price, is_assigned)
        VALUES (?, 'api_gst_to_contact', NULL, 1)
        ON DUPLICATE KEY UPDATE is_assigned = 1;
      `, [u.id]);
    }
    console.log('✅ Assigned api_gst_to_contact to all users in user_api_pricing with is_assigned = 1');

    console.log('🎉 Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to setup GST to Contact API:', error);
    process.exit(1);
  }
}

setupGstToContactApi();
