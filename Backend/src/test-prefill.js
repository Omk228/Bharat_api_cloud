import app from './app.js';
import { initDatabase } from './core/config/initDb.js';
import { startAuditWorker } from './core/queue/audit.worker.js';
import CacheService from './core/cache/cache.service.js';

const runPrefillTest = async () => {
  try {
    await initDatabase();
    startAuditWorker();
  } catch (e) {
    console.log('DB Note:', e.message);
  }

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`\n📱 Mobile to Prefill Test Server running on port ${port}`);
    console.log('📊 Cache Engine Stats:', CacheService.getStats());

    try {
      // 1. Get API Credentials
      const testEmail = `prefilltest_${Date.now()}@bharatcloud.io`;
      const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Om Kumar Jha',
          email: testEmail,
          password: 'Password@123',
          company_name: 'Bharat Fintech'
        })
      });
      const signupData = await signupRes.json();
      const token = signupData.data?.token;

      const credsRes = await fetch(`${baseUrl}/api/v1/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const credsData = await credsRes.json();
      const { api_id, api_key, token_id } = credsData.data[0];

      console.log(`🔑 Testing with Credentials: API_ID=${api_id}`);

      // 2. Prefill Request 1 (Live Upstream / Initial Call)
      console.log('\n--- ⏱️ TEST 1: POST /srv4/credit-report/prefill (Initial Call) ---');
      const start1 = performance.now();
      const res1 = await fetch(`${baseUrl}/srv4/credit-report/prefill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          mobile_number: '9876543210',
          first_name: 'Som',
          last_name: 'Kumar'
        })
      });
      const data1 = await res1.json();
      const duration1 = (performance.now() - start1).toFixed(2);
      console.log(`⏱️ Request 1 Status: ${res1.status} | Total Time: ${duration1}ms`);
      console.log('Payload:', JSON.stringify(data1, null, 2));

      // 3. Prefill Request 2 (Redis Cache Hit)
      console.log('\n--- ⚡ TEST 2: POST /srv4/credit-report/prefill (Redis Cache Hit) ---');
      const start2 = performance.now();
      const res2 = await fetch(`${baseUrl}/srv4/credit-report/prefill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          mobile_number: '9876543210',
          first_name: 'Som',
          last_name: 'Kumar'
        })
      });
      const data2 = await res2.json();
      const duration2 = (performance.now() - start2).toFixed(2);
      console.log(`⚡ Request 2 Status: ${res2.status} | Total Time: ${duration2}ms (Cached: ${data2._cached})`);

      console.log('\n========================================================');
      console.log(`🎯 MOBILE TO PREFILL BENCHMARK:`);
      console.log(`   1st Hit (Live Upstream) : ${duration1}ms`);
      console.log(`   2nd Hit (Redis Cache)   : ${duration2}ms  <-- ⚡ INSTANT!`);
      console.log('========================================================\n');

    } catch (err) {
      console.error('❌ Prefill test error:', err);
    } finally {
      server.close(() => {
        console.log('🧪 Prefill test server shut down cleanly.');
        process.exit(0);
      });
    }
  });
};

runPrefillTest();
