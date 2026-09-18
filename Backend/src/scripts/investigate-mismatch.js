import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import { credentialResolver } from '../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../core/utils/httpAgent.js';

async function investigate() {
  try {
    const [user] = await dbPool.query('SELECT id, email FROM users WHERE email = ?', ['loan@geetpay.in']);
    const userId = user[0].id;

    console.log('========================================================================');
    console.log('🔍 INVESTIGATING WHY BHARAT API CLOUD HAS HITS BUT UPSTREAM HAS NONE');
    console.log('========================================================================');

    // 1. Check ID range and distribution of logs on Sept 16
    const [stats] = await dbPool.query(`
      SELECT 
        MIN(id) as min_id, 
        MAX(id) as max_id, 
        COUNT(*) as total_records,
        COUNT(DISTINCT client_ref_num) as unique_client_refs,
        COUNT(DISTINCT request_id) as unique_request_ids
      FROM api_hit_logs
      WHERE user_id = ? AND created_at >= '2026-09-15 18:30:00' AND created_at <= '2026-09-16 18:29:59'
    `, [userId]);
    console.log('\n📊 16 Sept DB Records:');
    console.table(stats);

    // 2. Breakdown by client IP and prefix
    const [refFormats] = await dbPool.query(`
      SELECT 
        SUBSTRING_INDEX(client_ref_num, '_', 1) as ref_prefix,
        environment,
        client_ip,
        COUNT(*) as count
      FROM api_hit_logs
      WHERE user_id = ? AND created_at >= '2026-09-15 18:30:00' AND created_at <= '2026-09-16 18:29:59'
      GROUP BY ref_prefix, environment, client_ip
    `, [userId]);
    console.log('\n🌐 Client IP and Reference Prefixes:');
    console.table(refFormats);

    // 3. Inspect a sample of actual logs
    const [sampleLogs] = await dbPool.query(`
      SELECT id, endpoint, client_ref_num, client_ip, environment, latency_ms, status_code, cost, created_at
      FROM api_hit_logs
      WHERE user_id = ? AND created_at >= '2026-09-15 18:30:00' AND created_at <= '2026-09-16 18:29:59'
      ORDER BY id ASC
      LIMIT 10
    `, [userId]);
    console.log('\n📝 Sample Logs (Early 16 Sept):');
    console.table(sampleLogs);

    // 4. Check if live upstream test actually reaches IDSPay or fails
    console.log('\n🧪 Testing live upstream connectivity to IDSPay...');
    try {
      const idspayCreds = await credentialResolver.getIdspayCredentials();
      console.log('IDSPay Creds configured:', {
        baseUrl: idspayCreds.baseUrl,
        apiId: idspayCreds.apiId ? idspayCreds.apiId : 'MISSING',
        apiKey: idspayCreds.apiKey ? 'PRESENT (' + idspayCreds.apiKey.slice(0, 8) + '...)' : 'MISSING',
        tokenId: idspayCreds.tokenId ? 'PRESENT (' + idspayCreds.tokenId.slice(0, 8) + '...)' : 'MISSING'
      });

      // Test a real call to IDSPay
      const testUrl = `${idspayCreds.baseUrl}/srv4/credit-report/prefill`;
      console.log(`Pinging upstream URL: ${testUrl}`);
      const t0 = Date.now();
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id: idspayCreds.apiId,
          api_key: idspayCreds.apiKey,
          token_id: idspayCreds.tokenId,
          mobile_number: '9876543210',
          first_name: 'TEST'
        }),
        signal: AbortSignal.timeout(5000)
      }).catch(e => ({ error: e.message }));

      if (res.error) {
        console.log('❌ Upstream connection failed:', res.error);
      } else {
        const text = await res.text();
        console.log(`✅ Upstream responded in ${Date.now() - t0}ms, HTTP Status: ${res.status}`);
        console.log('Upstream response body:', text.slice(0, 300));
      }
    } catch (testErr) {
      console.error('Error during upstream test:', testErr.message);
    }

    // 5. Let's check api_credentials table for Geetpay
    const [creds] = await dbPool.query('SELECT * FROM api_credentials WHERE user_id = ?', [userId]);
    console.log('\n🔑 Geetpay API Credentials in DB:');
    console.table(creds);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
}

investigate();
