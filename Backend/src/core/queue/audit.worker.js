import { Worker } from 'bullmq';
import { dbPool } from '../config/db.config.js';
import { getRedisClient, getIsRedisConnected } from '../config/redis.config.js';
import { ENV } from '../config/env.config.js';

let auditWorker = null;

/**
 * Process a single API Audit and Billing Job
 * @param {object} jobData 
 */
export async function processAuditJob(jobData) {
  const {
    userId,
    credentialId,
    endpoint,
    method,
    requestId,
    clientRefNum,
    statusCode,
    resultCode,
    durationMs,
    clientIp,
    cost = 0.00,
    environment = 'sandbox',
    isSuccess = false
  } = jobData;

  try {
    const isOkStatus = (statusCode === 200 || statusCode === '200' || isSuccess === true) && statusCode !== 404 && statusCode !== 422 && statusCode !== 500 && statusCode !== 400 && statusCode !== 401 && statusCode !== 403 && statusCode !== 429 && statusCode !== 502 && statusCode !== 503;
    let finalCost = isOkStatus ? (typeof cost === 'number' ? cost : parseFloat(cost || 0)) : 0.00;

    // If cost was not passed or 0 on successful API hit, dynamically resolve effective price with 18% GST
    if (isOkStatus && (!finalCost || finalCost <= 0) && userId && endpoint) {
      try {
        const { PricingService } = await import('../../modules/pricing/pricing.service.js');
        finalCost = await PricingService.getEffectivePrice(endpoint, userId);
      } catch (err) {
        finalCost = 2.36; // Base ₹2.00 + 18% GST fallback
      }
    }

    // 1. Insert Hit Log into MySQL
    const logQuery = `
      INSERT INTO api_hit_logs (
        user_id, credential_id, endpoint, method, request_id,
        client_ref_num, status_code, result_code, latency_ms,
        client_ip, cost, environment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbPool.query(logQuery, [
      userId || null,
      credentialId || null,
      endpoint,
      method,
      requestId,
      clientRefNum || null,
      statusCode || 200,
      resultCode || 101,
      durationMs || 0,
      clientIp || '127.0.0.1',
      finalCost,
      environment
    ]);

    // 2. Wallet Balance Settlement (Atomic Debit from users.wallet_balance)
    if (finalCost > 0 && isSuccess && userId) {
      await dbPool.query(
        'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?',
        [finalCost, userId]
      );
    }
  } catch (error) {
    console.error('❌ [AUDIT WORKER ERROR] Failed to process audit log/billing:', error.message);
    throw error; // Let BullMQ retry if configured
  }
}

/**
 * Initialize BullMQ Worker
 */
export function startAuditWorker() {
  if (auditWorker) return auditWorker;

  if (getIsRedisConnected() && ENV.REDIS.ENABLED) {
    try {
      const redis = getRedisClient();
      auditWorker = new Worker(
        'api-audit-queue',
        async (job) => {
          await processAuditJob(job.data);
        },
        {
          connection: redis,
          concurrency: 10,
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 }
        }
      );

      auditWorker.on('completed', (job) => {
        // Silently complete
      });

      auditWorker.on('failed', (job, err) => {
        console.error(`⚠️ [AUDIT WORKER JOB FAILED] Job ${job.id}:`, err.message);
      });

      auditWorker.on('error', () => {
        // Suppress background version check errors gracefully
      });

      console.log('✅ BullMQ Audit & Billing Worker initialized and running.');
    } catch (err) {
      console.log('ℹ️ BullMQ Worker note: Running in In-Process Async Worker mode.');
    }
  }

  return auditWorker;
}

/**
 * Graceful Shutdown for Worker
 */
export async function stopAuditWorker() {
  if (auditWorker) {
    console.log('🛑 Closing BullMQ Audit Worker...');
    await auditWorker.close();
    auditWorker = null;
  }
}

export default {
  processAuditJob,
  startAuditWorker,
  stopAuditWorker
};
