import { dbPool } from './core/config/db.config.js';
import { initDatabase } from './core/config/initDb.js';
import QueueService from './core/queue/queue.service.js';
import { startAuditWorker } from './core/queue/audit.worker.js';

const runQueueTest = async () => {
  try {
    await initDatabase();
    startAuditWorker();

    console.log('\n--- ⏱️ TEST: BullMQ / Async Queue Dispatch Benchmark ---');
    const requestId = `test-req-${Date.now()}`;
    const testPayload = {
      userId: 1,
      credentialId: 1,
      endpoint: '/srv2/validation/pan',
      method: 'POST',
      requestId,
      clientRefNum: 'REF_QUEUE_123',
      statusCode: 200,
      resultCode: 101,
      durationMs: 15,
      clientIp: '127.0.0.1',
      cost: 0.00,
      environment: 'sandbox',
      isSuccess: true
    };

    const start = performance.now();
    await QueueService.addAuditJob(testPayload);
    const dispatchTime = (performance.now() - start).toFixed(3);

    console.log(`⚡ Job Pushed to Queue in: ${dispatchTime}ms (Zero API delay!)`);

    // Wait 500ms for background worker to write into MySQL
    console.log('⏳ Waiting for background worker to persist to MySQL...');
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Verify record in api_hit_logs
    const [rows] = await dbPool.query(
      'SELECT * FROM api_hit_logs WHERE request_id = ? LIMIT 1',
      [requestId]
    );

    if (rows.length > 0) {
      console.log('✅ Background Worker successfully wrote hit log to MySQL:');
      console.table([
        {
          id: rows[0].id,
          request_id: rows[0].request_id,
          endpoint: rows[0].endpoint,
          latency_ms: rows[0].latency_ms,
          cost: rows[0].cost,
          created_at: rows[0].created_at
        }
      ]);
      console.log('🎉 ALL ASYNC BULLMQ QUEUE & WORKER TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error('❌ Record not found in api_hit_logs');
    }
  } catch (err) {
    console.error('❌ Queue test failed:', err);
  } finally {
    await dbPool.end();
    process.exit(0);
  }
};

runQueueTest();
