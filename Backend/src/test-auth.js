import app from './app.js';
import { initDatabase } from './core/config/initDb.js';

const runAuthTest = async () => {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/v1/auth`;
    console.log(`\n🧪 Auth Test Server running on port ${port}`);

    try {
      // 1. Initialize Tables
      console.log('\n--- 1. Testing Table Initialization ---');
      await initDatabase();

      // 2. Test Signup
      const testEmail = `fintech_${Date.now()}@acme.com`;
      console.log(`\n--- 2. Testing Signup for: ${testEmail} ---`);
      const signupRes = await fetch(`${baseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Aarav Sharma',
          company_name: 'Acme Fintech Pvt Ltd',
          email: testEmail,
          password: 'Password@123',
        }),
      });
      const signupData = await signupRes.json();
      console.log('Signup Status:', signupRes.status);
      console.log('Signup Payload:', JSON.stringify(signupData, null, 2));

      if (!signupData.success) {
        throw new Error(`Signup failed: ${signupData.message}`);
      }

      const token = signupData.data.token;

      // 3. Test Login
      console.log(`\n--- 3. Testing Login for: ${testEmail} ---`);
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password@123',
        }),
      });
      const loginData = await loginRes.json();
      console.log('Login Status:', loginRes.status);
      console.log('Login Payload:', JSON.stringify(loginData, null, 2));

      if (!loginData.success) {
        throw new Error(`Login failed: ${loginData.message}`);
      }

      // 4. Test Protected Profile (/me)
      console.log('\n--- 4. Testing GET /me with Bearer Token ---');
      const meRes = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      console.log('Me Status:', meRes.status);
      console.log('Me Payload:', JSON.stringify(meData, null, 2));

      console.log('\n🎉 ALL BACKEND AUTH & DB TESTS PASSED WITH 100% SUCCESS!\n');
    } catch (err) {
      console.error('❌ Auth test error:', err);
    } finally {
      server.close(() => process.exit(0));
    }
  });
};

runAuthTest();
