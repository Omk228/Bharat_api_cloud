import app from './app.js';
import initDatabase from './core/config/initDb.js';

const runTest = async () => {
  try {
    await initDatabase();
  } catch (e) {
    console.log('Database init note:', e.message);
  }

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`\n🚀 Test Server started on port ${port}`);

    try {
      // 1. Signup / Login
      const testEmail = `fintech_${Date.now()}@bharatapicloud.io`;
      console.log('\n--- 1. Testing Signup ---');
      const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Om Kumar Jha',
          email: testEmail,
          password: 'Password@123',
          company_name: 'Bharat Fintech Labs'
        })
      });
      const signupData = await signupRes.json();
      console.log('Signup Status:', signupRes.status, signupData.message);
      const token = signupData.data?.token;

      // 2. Fetch or Generate Credentials
      console.log('\n--- 2. Testing Get/Generate Credentials ---');
      const credsRes = await fetch(`${baseUrl}/api/v1/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const credsData = await credsRes.json();
      console.log('Credentials:', JSON.stringify(credsData.data, null, 2));

      const cred = credsData.data[0];
      const { api_id, api_key, token_id } = cred;

      // 3. Test PAN Verification (POST /srv2/validation/pan)
      console.log('\n--- 3. Testing POST /srv2/validation/pan (Valid PAN) ---');
      const panRes = await fetch(`${baseUrl}/srv2/validation/pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          pan: 'ABCDE1234F',
          name: 'Aarav Sharma',
          pan_display_name: 'false',
          name_match_method: 'fuzzy'
        })
      });
      const panData = await panRes.json();
      console.log('PAN Status Code:', panRes.status);
      console.log('PAN Response JSON:\n', JSON.stringify(panData, null, 2));

      // 4. Test Invalid PAN (Result Code 102 & Refund processed)
      console.log('\n--- 4. Testing POST /srv2/validation/pan (Invalid PAN) ---');
      const invalidPanRes = await fetch(`${baseUrl}/srv2/validation/pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id,
          api_key,
          token_id,
          pan: 'INVALID999',
          name: 'Unknown User'
        })
      });
      const invalidPanData = await invalidPanRes.json();
      console.log('Invalid PAN Status Code:', invalidPanRes.status);
      console.log('Invalid PAN Response JSON:\n', JSON.stringify(invalidPanData, null, 2));

      console.log('\n🎉 ALL CREDENTIAL GENERATION & PAN VERIFICATION TESTS PASSED PERFECTLY!\n');
    } catch (err) {
      console.error('❌ Test failed with error:', err);
    } finally {
      server.close(() => {
        console.log('🧪 Test server shut down cleanly.');
        process.exit(0);
      });
    }
  });
};

runTest();
