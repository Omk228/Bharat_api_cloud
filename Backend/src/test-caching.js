import app from './app.js';
import { initDatabase } from './core/config/initDb.js';
import CacheService from './core/cache/cache.service.js';

const runCachingTest = async () => {
  try {
    await initDatabase();
  } catch (e) {
    console.log('Database note:', e.message);
  }

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`\n🚀 Speed & Caching Test Server running on port ${port}`);
    console.log('📊 Cache Engine Stats:', CacheService.getStats());

    try {
      // 1. Signup & Credentials
      const testEmail = `speedtest_${Date.now()}@bharatcloud.io`;
      const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Om Kumar Jha',
          email: testEmail,
          password: 'Password@123',
          company_name: 'Speed Labs'
        })
      });
      const signupData = await signupRes.json();
      const token = signupData.data?.token;

      const credsRes = await fetch(`${baseUrl}/api/v1/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const credsData = await credsRes.json();
      const { api_id, api_key, token_id } = credsData.data[0];

      // 2. PAN Verification - 1st Request (Cache Miss)
      console.log('\n--- ⏱️ TEST 1: PAN Request 1 (Initial Live / Cache Miss) ---');
      const start1 = performance.now();
      const panRes1 = await fetch(`${baseUrl}/srv2/validation/pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          pan: 'ABCDE1234F',
          name: 'Aarav Sharma'
        })
      });
      const panData1 = await panRes1.json();
      const duration1 = (performance.now() - start1).toFixed(2);
      console.log(`⏱️ Request 1 Total Time: ${duration1}ms (Status: ${panRes1.status})`);
      console.log(`   _cached property:`, panData1._cached || false);

      // 3. PAN Verification - 2nd Request (Cache Hit - INSTANT!)
      console.log('\n--- ⚡ TEST 2: PAN Request 2 (Same PAN - CACHE HIT TEST) ---');
      const start2 = performance.now();
      const panRes2 = await fetch(`${baseUrl}/srv2/validation/pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          pan: 'ABCDE1234F',
          name: 'Aarav Sharma'
        })
      });
      const panData2 = await panRes2.json();
      const duration2 = (performance.now() - start2).toFixed(2);
      console.log(`⚡ Request 2 Total Time: ${duration2}ms (Status: ${panRes2.status})`);
      console.log(`   _cached property:`, panData2._cached || false);

      // 4. PAN Verification - 3rd Request (Instant Validation)
      console.log('\n--- ⚡ TEST 3: PAN Request 3 (Same PAN - CACHE HIT TEST 2) ---');
      const start3 = performance.now();
      const panRes3 = await fetch(`${baseUrl}/srv2/validation/pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          pan: 'ABCDE1234F',
          name: 'Aarav Sharma'
        })
      });
      const duration3 = (performance.now() - start3).toFixed(2);
      console.log(`⚡ Request 3 Total Time: ${duration3}ms (Status: ${panRes3.status})`);

      console.log('\n========================================================');
      console.log(`🎯 LATENCY COMPARISON RESULT:`);
      console.log(`   1st Request (Uncached) : ${duration1}ms`);
      console.log(`   2nd Request (Cached)   : ${duration2}ms  <-- ⚡ SPEED BOOST!`);
      console.log(`   3rd Request (Cached)   : ${duration3}ms  <-- ⚡ SPEED BOOST!`);
      console.log('========================================================\n');

    } catch (err) {
      console.error('❌ Test error:', err);
    } finally {
      server.close(() => {
        console.log('🧪 Speed test server closed cleanly.');
        process.exit(0);
      });
    }
  });
};

runCachingTest();
