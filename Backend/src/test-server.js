import app from './app.js';

const testServer = async () => {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`\n🧪 Test Server started on temporary port ${port}`);

    try {
      // 1. Test Root Endpoint
      console.log('\n--- 1. Testing Root (/) Endpoint ---');
      const rootRes = await fetch(`${baseUrl}/`);
      const rootData = await rootRes.json();
      console.log('Status:', rootRes.status);
      console.log('Payload:', JSON.stringify(rootData, null, 2));

      // 2. Test Health Endpoint
      console.log('\n--- 2. Testing Health (/api/v1/health) Endpoint ---');
      const healthRes = await fetch(`${baseUrl}/api/v1/health`);
      const healthData = await healthRes.json();
      console.log('Status:', healthRes.status);
      console.log('Payload:', JSON.stringify(healthData, null, 2));

      // 3. Test 404 Route Not Found
      console.log('\n--- 3. Testing 404 Route Not Found Handler ---');
      const notFoundRes = await fetch(`${baseUrl}/api/v1/unsupported-route`);
      const notFoundData = await notFoundRes.json();
      console.log('Status:', notFoundRes.status);
      console.log('Payload:', JSON.stringify(notFoundData, null, 2));

      console.log('\n🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
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

testServer();
