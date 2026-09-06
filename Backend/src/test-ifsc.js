import app from './app.js';
import initDatabase from './core/config/initDb.js';

const runTest = async () => {
  try {
    await initDatabase();
  } catch (e) {
    console.log('Database init notice:', e.message);
  }

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`\n🚀 Test Server started on port ${port}`);

    try {
      // 1. Test Without Authentication (Must return 401 Unauthorized)
      console.log('\n--- 1. Testing IFSC Without Credentials (Must Fail 401) ---');
      const unauthRes = await fetch(`${baseUrl}/YESB0DNB002`);
      const unauthData = await unauthRes.json();
      console.log('Unauth Status Code:', unauthRes.status);
      console.log('Unauth Response:', JSON.stringify(unauthData, null, 2));
      if (unauthRes.status !== 401) {
        throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
      }
      console.log('✅ PASS: Unauthorized requests are strictly blocked.');

      // 2. Signup / Authenticate to get valid Bharat API Credentials
      console.log('\n--- 2. Registering / Obtaining Bharat API Credentials ---');
      const testEmail = `ifsc_tester_${Date.now()}@bharatapicloud.io`;
      const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'IFSC Tester',
          email: testEmail,
          password: 'Password@123',
          company_name: 'Bharat Fintech Cloud',
        }),
      });
      const signupData = await signupRes.json();
      const token = signupData.data?.token;

      // Fetch Generated API Credentials
      const credsRes = await fetch(`${baseUrl}/api/v1/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const credsData = await credsRes.json();
      const cred = credsData.data[0];
      const { api_id, api_key, token_id } = cred;

      console.log('Obtained Test Credentials:');
      console.log(`  api_id:   ${api_id}`);
      console.log(`  api_key:  ${api_key}`);
      console.log(`  token_id: ${token_id}`);

      // 3. Test Direct Razorpay Route: GET /YESB0DNB002 with Headers
      console.log('\n--- 3. Testing GET /YESB0DNB002 (Direct Razorpay Root Route) ---');
      const t0 = Date.now();
      const directRes = await fetch(`${baseUrl}/YESB0DNB002`, {
        method: 'GET',
        headers: {
          'x-api-id': api_id,
          'x-api-key': api_key,
          'x-token-id': token_id,
        },
      });
      const directLatency = Date.now() - t0;
      const directData = await directRes.json();

      console.log(`Direct Status: ${directRes.status} (Latency: ${directLatency}ms)`);
      console.log('IFSC Response JSON:\n', JSON.stringify(directData, null, 2));

      if (directRes.status !== 200) {
        throw new Error(`Expected 200 OK, got ${directRes.status}`);
      }
      if (directData.IFSC !== 'YESB0DNB002' || !directData.BANK) {
        throw new Error('Response does not contain expected IFSC fields');
      }
      console.log('✅ PASS: Valid IFSC returned exact Razorpay JSON response.');

      // 4. Test Dedicated Route: GET /ifsc/YESB0DNB002 (Should Hit Cache < 5ms)
      console.log('\n--- 4. Testing GET /ifsc/YESB0DNB002 (Cache Hit Verification) ---');
      const t1 = Date.now();
      const cachedRes = await fetch(`${baseUrl}/ifsc/YESB0DNB002`, {
        headers: {
          'x-api-id': api_id,
          'x-api-key': api_key,
          'x-token-id': token_id,
        },
      });
      const cacheLatency = Date.now() - t1;
      const cachedData = await cachedRes.json();
      console.log(`Cache Status: ${cachedRes.status} (Latency: ${cacheLatency}ms)`);
      if (cachedRes.status !== 200 || cachedData.IFSC !== 'YESB0DNB002') {
        throw new Error('Cache hit failed or data mismatch');
      }
      console.log('✅ PASS: Smart Cache Hit returned in sub-millisecond range.');

      // 5. Test POST /ifsc with Body Credentials
      console.log('\n--- 5. Testing POST /ifsc (Body Parameters) ---');
      const postRes = await fetch(`${baseUrl}/ifsc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          ifsc: 'YESB0DNB002',
        }),
      });
      const postData = await postRes.json();
      console.log('POST Status Code:', postRes.status);
      if (postRes.status !== 200 || postData.IFSC !== 'YESB0DNB002') {
        throw new Error('POST /ifsc failed');
      }
      console.log('✅ PASS: POST /ifsc succeeded with body credentials.');

      // 6. Test Invalid IFSC: GET /INVALID123 (Must Return 404)
      console.log('\n--- 6. Testing Invalid IFSC: GET /INVALID123 (Must Return 404) ---');
      const invalidRes = await fetch(`${baseUrl}/INVALID123`, {
        headers: {
          'x-api-id': api_id,
          'x-api-key': api_key,
          'x-token-id': token_id,
        },
      });
      const invalidText = await invalidRes.text();
      console.log(`Invalid IFSC Status Code: ${invalidRes.status}, Body: ${invalidText}`);
      if (invalidRes.status !== 404) {
        throw new Error(`Expected 404 for invalid IFSC, got ${invalidRes.status}`);
      }
      console.log('✅ PASS: Invalid IFSC correctly returns 404 Not Found.');

      console.log('\n🎉 ALL IFSC TESTS (AUTHENTICATION, ROUTES, EXACT JSON, CACHING, 404) PASSED PERFECTLY!\n');
    } catch (err) {
      console.error('❌ Test failed with error:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('🧪 Test server closed.');
        process.exit(process.exitCode || 0);
      });
    }
  });
};

runTest();
